const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Compress an image and save it to the output folder
function compressImage(inputPath, outputPath, quality = 80) {
  sharp(inputPath)
    .resize({ width: 800 }) // Adjust width as needed, preserving aspect ratio
    .jpeg({ quality: quality }) // JPEG format with quality setting
    .toFile(outputPath, (err, info) => {
      if (err) {
        console.error(`Error compressing ${inputPath}:`, err);
      } else {
        console.log(`Image saved to ${outputPath}:`, info);
      }
    });
}

// Compress all images in a folder
function compressAllImages(inputFolder, outputFolder, quality = 80) {
  fs.readdir(inputFolder, (err, files) => {
    if (err) {
      console.error('Error reading input folder:', err);
      return;
    }

    files.forEach((file) => {
      const inputPath = path.join(inputFolder, file);
      const outputPath = path.join(outputFolder, file);

      // Compress only image files
      if (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png')) {
        compressImage(inputPath, outputPath, quality);
      }
    });
  });
}

// Example usage: Compress images in 'images' folder and save to 'compressed'
compressAllImages(path.join(__dirname, 'public'), path.join(__dirname, 'compressed'), 80);
