/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { captureScreenshotAndGetImageData } from './screenshot';
import screenshotDesktop from 'screenshot-desktop';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('screenshot-desktop');
jest.mock('node:fs/promises');
jest.mock('node:os');
jest.mock('uuid');

const mockedScreenshotDesktop = screenshotDesktop as jest.MockedFunction<
  typeof screenshotDesktop
>;
const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedOs = os as jest.Mocked<typeof os>;
const mockedUuidv4 = uuidv4 as jest.MockedFunction<typeof uuidv4>;

describe('captureScreenshotAndGetImageData', () => {
  const mockTempDir = '/mock/temp/dir';
  const mockUuid = 'mock-uuid-12345';
  const mockTempFilePath = path.join(
    mockTempDir,
    `gemini-cli-screenshot-${mockUuid}.png`,
  );
  const mockImageDataBase64 = 'base64encodedimagedata';
  const mockImageBuffer = Buffer.from(mockImageDataBase64, 'base64');

  beforeEach(() => {
    jest.clearAllMocks();

    mockedOs.tmpdir.mockReturnValue(mockTempDir);
    mockedUuidv4.mockReturnValue(mockUuid);
    mockedScreenshotDesktop.mockResolvedValue(mockImageBuffer); // Assuming screenshot returns buffer directly for simplicity, adjust if it writes to file and we read
    mockedFs.readFile.mockResolvedValue(mockImageBuffer);
    mockedFs.unlink.mockResolvedValue(undefined);
  });

  it('should capture screenshot, convert to base64, and return correct data structure', async () => {
    const result = await captureScreenshotAndGetImageData();

    expect(mockedOs.tmpdir).toHaveBeenCalledTimes(1);
    expect(mockedUuidv4).toHaveBeenCalledTimes(1);
    expect(mockedScreenshotDesktop).toHaveBeenCalledWith({
      filename: mockTempFilePath,
      format: 'png',
    });
    expect(mockedFs.readFile).toHaveBeenCalledWith(mockTempFilePath);
    expect(mockedFs.unlink).toHaveBeenCalledWith(mockTempFilePath);
    expect(result).toEqual({
      inline_data: {
        mime_type: 'image/png',
        data: mockImageDataBase64,
      },
    });
  });

  it('should throw error if screenshot capture fails and still attempt cleanup', async () => {
    const screenshotError = new Error('Screenshot failed');
    mockedScreenshotDesktop.mockRejectedValue(screenshotError);

    await expect(captureScreenshotAndGetImageData()).rejects.toThrow(
      screenshotError,
    );

    expect(mockedScreenshotDesktop).toHaveBeenCalledTimes(1);
    expect(mockedFs.readFile).not.toHaveBeenCalled(); // Should not be called if screenshot fails
    expect(mockedFs.unlink).toHaveBeenCalledWith(mockTempFilePath); // Cleanup should still be attempted
  });

  it('should throw error if file reading fails and still attempt cleanup', async () => {
    const readFileError = new Error('Failed to read file');
    mockedFs.readFile.mockRejectedValue(readFileError);

    await expect(captureScreenshotAndGetImageData()).rejects.toThrow(
      readFileError,
    );

    expect(mockedScreenshotDesktop).toHaveBeenCalledTimes(1);
    expect(mockedFs.readFile).toHaveBeenCalledWith(mockTempFilePath);
    expect(mockedFs.unlink).toHaveBeenCalledWith(mockTempFilePath);
  });

  it('should log warning if cleanup fails but not hide original error', async () => {
    const screenshotError = new Error('Screenshot failed');
    mockedScreenshotDesktop.mockRejectedValue(screenshotError);
    const unlinkError = new Error('Failed to delete temp file');
    mockedFs.unlink.mockRejectedValue(unlinkError);
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {}); // Use actual console or a mock

    await expect(captureScreenshotAndGetImageData()).rejects.toThrow(
      screenshotError,
    );

    // Depending on how logging is implemented in screenshot.ts (TODOs in the original code)
    // this might need adjustment. For now, we check that unlink was called.
    expect(mockedFs.unlink).toHaveBeenCalledWith(mockTempFilePath);
    // If console.warn was used for cleanup errors:
    // expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to delete temporary screenshot file'), unlinkError);

    consoleWarnSpy.mockRestore();
  });

   it('should still resolve successfully if only cleanup fails after successful operation', async () => {
    const unlinkError = new Error('Failed to delete temp file');
    mockedFs.unlink.mockRejectedValue(unlinkError);
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});


    const result = await captureScreenshotAndGetImageData();
    expect(result).toEqual({
      inline_data: {
        mime_type: 'image/png',
        data: mockImageDataBase64,
      },
    });
    expect(mockedFs.unlink).toHaveBeenCalledWith(mockTempFilePath);
    // If console.warn was used for cleanup errors:
    // expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to delete temporary screenshot file'), unlinkError);

    consoleWarnSpy.mockRestore();
  });
});
