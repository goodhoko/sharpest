/**
 * TODO
 * - reference: load original, convert to png, downscale to 600, save
 * - compare visually with on-site downscaled image - should be the same!
 * - generate jpgs for sizes and qualities
 * - load each, convert to png downscale to 600, save
 * - compare visually
 * - measure file-size
 * - compute per-pixel cumulative diff
 * - plot, evaluate
 */

const sharp = require('sharp')
const fs = require('fs')

const qualities = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10]
const dimensions = [1800, 1700, 1600, 1500, 1400, 1300, 1200, 1100, 1000]
const input_images = fs.readdirSync('./original').filter(s => s.match(/\.jpg$/))

async function main() {
    const output = []

    for (let image of input_images) {
        const original_file = `original/${image}`;
        const image_name = image.replace(/\.jpg$/, '');

        // this will serve as reference for comparison of the normalized images
        const original_normalized_file = `normalized/${image_name}_original_normalized.png`;
        await sharp(original_file)
            .png()
            .resize(1000, null)
            .toFile(original_normalized_file);

        for (let [quality, dimension] of cartesian(qualities, dimensions)) {
            console.log(image_name, quality, dimension)

            // the jpeg representation, we're actually interested in
            const jpeg_file = `jpeg/${image_name}_${dimension}_${quality}.jpg`;
            await sharp(original_file)
                .jpeg({quality: quality, fastShrinkOnLoad: false})
                .resize(dimension, null)
                .toFile(jpeg_file);

            const normalized = `normalized/${image_name}_${dimension}_${quality}.png`
            await sharp(jpeg_file)
                .png()
                .resize(1000, null)
                .toFile(normalized);

            const diff = await diffImages(normalized, original_normalized_file)

            output.push({
                original: original_file,
                original_normalized: original_normalized_file,
                jpeg: jpeg_file,
                normalized: normalized,
                fileSize: fs.statSync(jpeg_file).size,
                dimension: dimension,
                quality: quality,
                diff: diff
            })
        }
    }
    fs.writeFileSync('html/output.js', `const images = ${JSON.stringify(output)};`);
}

main()

async function diffImages(path1, path2) {
    const image1 = await sharp(path1)
        .raw()
        .toBuffer();

    const image2 = await sharp(path2)
        .raw()
        .toBuffer();

    if (image1.length !== image2.length) {
        throw Error('Can not diff images of different dimensions.')
    }

    return image1.reduce((acc, subPixel, index) => acc + Math.abs(subPixel - image2[index]))
}

// taken from https://stackoverflow.com/a/44338759/5698865
function* cartesian(head, ...tail) {
    let remainder = tail.length ? cartesian(...tail) : [[]];
    for (let r of remainder) for (let h of head) yield [h, ...r];
}
