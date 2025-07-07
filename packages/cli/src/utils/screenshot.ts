/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import screenshot from 'screenshot-desktop';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid'; // For unique temporary file names

/**
 * Captures a screenshot of the entire desktop, saves it as a PNG,
 * converts it to base64, and returns it in the Gemini API format.
 *
 * @returns A Promise that resolves with an object containing the
 *          base64 encoded image data and mime type, or rejects if an error occurs.
 * @throws Will throw an error if screenshot capture, file reading, or deletion fails.
 */
export async function captureScreenshotAndGetImageData(): Promise<{
  inline_data: { mime_type: string; data: string };
}> {
  const tempId = uuidv4();
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, `gemini-cli-screenshot-${tempId}.png`);

  // console.debug(`Attempting to capture screenshot to: ${tempFilePath}`); // TODO: Add proper debug logging

  try {
    await screenshot({ filename: tempFilePath, format: 'png' });
    // console.debug(`Screenshot saved to ${tempFilePath}`);

    const imageBuffer = await fs.readFile(tempFilePath);
    const base64Data = imageBuffer.toString('base64');
    // console.debug(`Screenshot read and converted to base64. Size: ${base64Data.length} chars`);

    return {
      inline_data: {
        mime_type: 'image/png',
        data: base64Data,
      },
    };
  } catch (error) {
    // console.error('Error during screenshot capture or processing:', error); // TODO: Add proper error logging
    // Rethrow the error to be handled by the caller
    throw error;
  } finally {
    try {
      await fs.unlink(tempFilePath);
      // console.debug(`Temporary screenshot file ${tempFilePath} deleted.`);
    } catch (cleanupError) {
      // Log cleanup error but don't let it hide the original error if one occurred.
      // console.warn(`Failed to delete temporary screenshot file ${tempFilePath}:`, cleanupError); // TODO: Add proper warning logging
    }
  }
}

// Basic test function (can be run manually with ts-node or similar)
/*
async function testCapture() {
  console.log('Testing screenshot capture...');
  try {
    const result = await captureScreenshotAndGetImageData();
    console.log('Screenshot captured successfully!');
    console.log('MIME Type:', result.inline_data.mime_type);
    console.log('Data (first 100 chars):', result.inline_data.data.substring(0, 100) + '...');
    // You can copy the full base64 string and test it in a base64 to image viewer online.
    // For example: await fs.writeFile('test_output.txt', result.inline_data.data);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// To run the test:
// 1. Ensure you have ts-node installed (npm install -g ts-node)
// 2. Make sure your tsconfig.json allows module: commonjs or similar for ts-node if run directly,
//    or adjust command. This project uses ES Modules.
// 3. Navigate to packages/cli/src/utils and run:
//    NODE_OPTIONS='--loader=ts-node/esm' ts-node screenshot.ts
// if (require.main === module) { // This check doesn't work well with ESM and ts-node loaders
//   testCapture();
// }
*/
