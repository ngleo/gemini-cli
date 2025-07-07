/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { render } from 'ink-testing-library';
import { AppWrapper as App } from './App.js';
import {
  Config as ServerConfig,
  MCPServerConfig,
  ApprovalMode,
  ToolRegistry,
  AccessibilitySettings,
  SandboxConfig,
} from '@google/gemini-cli-core';
import { LoadedSettings, SettingsFile, Settings, defaultSettings } from '../config/settings.js';
import process from 'node:process';
import { Key as InkKeyType } from 'ink';


// Mock screenshot utility
vi.mock('../utils/screenshot');
import { captureScreenshotAndGetImageData } from '../utils/screenshot.js';
const mockedCaptureScreenshot = captureScreenshotAndGetImageData as vi.MockedFunction<typeof captureScreenshotAndGetImageData>;


// Define a more complete mock server config based on actual Config
interface MockServerConfig {
  apiKey: string;
  model: string;
  sandbox?: SandboxConfig;
  targetDir: string;
  debugMode: boolean;
  question?: string;
  fullContext: boolean;
  coreTools?: string[];
  toolDiscoveryCommand?: string;
  toolCallCommand?: string;
  mcpServerCommand?: string;
  mcpServers?: Record<string, MCPServerConfig>; // Use imported MCPServerConfig
  userAgent: string;
  userMemory: string;
  geminiMdFileCount: number;
  approvalMode: ApprovalMode;
  vertexai?: boolean;
  showMemoryUsage?: boolean;
  accessibility?: AccessibilitySettings;
  embeddingModel: string;

  getApiKey: Mock<() => string>;
  getModel: Mock<() => string>;
  getSandbox: Mock<() => SandboxConfig | undefined>;
  getTargetDir: Mock<() => string>;
  getToolRegistry: Mock<() => ToolRegistry>; // Use imported ToolRegistry type
  getDebugMode: Mock<() => boolean>;
  getQuestion: Mock<() => string | undefined>;
  getFullContext: Mock<() => boolean>;
  getCoreTools: Mock<() => string[] | undefined>;
  getToolDiscoveryCommand: Mock<() => string | undefined>;
  getToolCallCommand: Mock<() => string | undefined>;
  getMcpServerCommand: Mock<() => string | undefined>;
  getMcpServers: Mock<() => Record<string, MCPServerConfig> | undefined>;
  getUserAgent: Mock<() => string>;
  getUserMemory: Mock<() => string>;
  setUserMemory: Mock<(newUserMemory: string) => void>;
  getGeminiMdFileCount: Mock<() => number>;
  setGeminiMdFileCount: Mock<(count: number) => void>;
  getApprovalMode: Mock<() => ApprovalMode>;
  setApprovalMode: Mock<(skip: ApprovalMode) => void>;
  getVertexAI: Mock<() => boolean | undefined>;
  getShowMemoryUsage: Mock<() => boolean>;
  getAccessibility: Mock<() => AccessibilitySettings>;
  getProjectRoot: Mock<() => string | undefined>;
  getAllGeminiMdFilenames: Mock<() => string[]>;
}

// Mock @google/gemini-cli-core and its Config class
vi.mock('@google/gemini-cli-core', async (importOriginal) => {
  const actualCore =
    await importOriginal<typeof import('@google/gemini-cli-core')>();
  const ConfigClassMock = vi
    .fn()
    .mockImplementation((optionsPassedToConstructor) => {
      const opts = { ...optionsPassedToConstructor }; // Clone
      // Basic mock structure, will be extended by the instance in tests
      return {
        apiKey: opts.apiKey || 'test-key',
        model: opts.model || 'test-model-in-mock-factory',
        sandbox: opts.sandbox,
        targetDir: opts.targetDir || '/test/dir',
        debugMode: opts.debugMode || false,
        question: opts.question,
        fullContext: opts.fullContext ?? false,
        coreTools: opts.coreTools,
        toolDiscoveryCommand: opts.toolDiscoveryCommand,
        toolCallCommand: opts.toolCallCommand,
        mcpServerCommand: opts.mcpServerCommand,
        mcpServers: opts.mcpServers,
        userAgent: opts.userAgent || 'test-agent',
        userMemory: opts.userMemory || '',
        geminiMdFileCount: opts.geminiMdFileCount || 0,
        approvalMode: opts.approvalMode ?? ApprovalMode.DEFAULT,
        vertexai: opts.vertexai,
        showMemoryUsage: opts.showMemoryUsage ?? false,
        accessibility: opts.accessibility ?? {},
        embeddingModel: opts.embeddingModel || 'test-embedding-model',

        getApiKey: vi.fn(() => opts.apiKey || 'test-key'),
        getModel: vi.fn(() => opts.model || 'test-model-in-mock-factory'),
        getSandbox: vi.fn(() => opts.sandbox),
        getTargetDir: vi.fn(() => opts.targetDir || '/test/dir'),
        getToolRegistry: vi.fn(() => ({}) as ToolRegistry), // Simple mock
        getDebugMode: vi.fn(() => opts.debugMode || false),
        getQuestion: vi.fn(() => opts.question),
        getFullContext: vi.fn(() => opts.fullContext ?? false),
        getCoreTools: vi.fn(() => opts.coreTools),
        getToolDiscoveryCommand: vi.fn(() => opts.toolDiscoveryCommand),
        getToolCallCommand: vi.fn(() => opts.toolCallCommand),
        getMcpServerCommand: vi.fn(() => opts.mcpServerCommand),
        getMcpServers: vi.fn(() => opts.mcpServers),
        getUserAgent: vi.fn(() => opts.userAgent || 'test-agent'),
        getUserMemory: vi.fn(() => opts.userMemory || ''),
        setUserMemory: vi.fn(),
        getGeminiMdFileCount: vi.fn(() => opts.geminiMdFileCount || 0),
        setGeminiMdFileCount: vi.fn(),
        getApprovalMode: vi.fn(() => opts.approvalMode ?? ApprovalMode.DEFAULT),
        setApprovalMode: vi.fn(),
        getVertexAI: vi.fn(() => opts.vertexai),
        getShowMemoryUsage: vi.fn(() => opts.showMemoryUsage ?? false),
        getAccessibility: vi.fn(() => opts.accessibility ?? {}),
        getProjectRoot: vi.fn(() => opts.projectRoot),
        getGeminiClient: vi.fn(() => ({})),
        getCheckpointingEnabled: vi.fn(() => opts.checkpointing ?? true),
        getAllGeminiMdFilenames: vi.fn(() => ['GEMINI.md']),
        setFlashFallbackHandler: vi.fn(),
      };
    });
  return {
    ...actualCore,
    Config: ConfigClassMock,
    MCPServerConfig: actualCore.MCPServerConfig,
    getAllGeminiMdFilenames: vi.fn(() => ['GEMINI.md']),
  };
});

// Mock heavy dependencies or those with side effects
vi.mock('./hooks/useGeminiStream', () => ({
  useGeminiStream: vi.fn(() => ({
    streamingState: 'Idle',
    submitQuery: vi.fn(),
    initError: null,
    pendingHistoryItems: [],
  })),
}));

vi.mock('./hooks/useAuthCommand', () => ({
  useAuthCommand: vi.fn(() => ({
    isAuthDialogOpen: false,
    openAuthDialog: vi.fn(),
    handleAuthSelect: vi.fn(),
    handleAuthHighlight: vi.fn(),
  })),
}));

vi.mock('./hooks/useLogger', () => ({
  useLogger: vi.fn(() => ({
    getPreviousUserMessages: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock('../config/config.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    // @ts-expect-error - this is fine
    ...actual,
    loadHierarchicalGeminiMemory: vi
      .fn()
      .mockResolvedValue({ memoryContent: '', fileCount: 0 }),
  };
});

describe('App UI', () => {
  let mockConfig: MockServerConfig;
  let mockSettings: LoadedSettings;
  let currentUnmount: (() => void) | undefined;
  // To store the actual useInput handler if we can grab it. For now, not used.
  let appInputHandler: ((input: string, key: InkKeyType) => void) | undefined;


  const createMockSettings = (
    settings: Partial<Settings> = {},
  ): LoadedSettings => {
    // Use a deep clone of defaultSettings.merged to avoid test interference
    const baseSettings = JSON.parse(JSON.stringify(defaultSettings.merged));
    const userSettingsFile: SettingsFile = {
      path: '/user/settings.json',
      settings: {}, // User specific overrides could go here
    };
    const workspaceSettingsFile: SettingsFile = {
      path: '/workspace/.gemini/settings.json',
      settings: { // Project specific overrides
        ...settings, // Passed in overrides for the test
      },
    };
    // Create LoadedSettings with a base and merge in project/user specifics
    // This ensures all default keys are present.
    const loaded = new LoadedSettings(userSettingsFile, workspaceSettingsFile, []);
    // Ensure merged settings reflect the test's intent over defaults
    loaded.merged = { ...baseSettings, ...settings };
    loaded.merged.autoConfigureMaxOldSpaceSize = false; // Important for tests
    return loaded;
  };


  beforeEach(() => {
    mockedCaptureScreenshot.mockReset();
    const ServerConfigMocked = vi.mocked(ServerConfig, true);
    mockConfig = new ServerConfigMocked({
      embeddingModel: 'test-embedding-model',
      sandbox: undefined,
      targetDir: '/test/dir',
      debugMode: false,
      userMemory: '',
      geminiMdFileCount: 0,
      showMemoryUsage: false,
      sessionId: 'test-session-id',
      cwd: '/tmp',
      model: 'model',
    }) as unknown as MockServerConfig;

    // Ensure the getShowMemoryUsage mock function is specifically set up if not covered by constructor mock
    if (!mockConfig.getShowMemoryUsage) {
      mockConfig.getShowMemoryUsage = vi.fn(() => false);
    }
    mockConfig.getShowMemoryUsage.mockReturnValue(false); // Default for most tests

    // Ensure a theme is set so the theme dialog does not appear by default.
    mockSettings = createMockSettings({ theme: 'Default', autoConfigureMaxOldSpaceSize: false });
  });

  afterEach(() => {
    if (currentUnmount) {
      currentUnmount();
      currentUnmount = undefined;
    }
    vi.clearAllMocks(); // Clear mocks after each test
    mockedCaptureScreenshot.mockClear();
  });

  // Helper function to render the app for tests
  // It's important that mockConfig and mockSettings are set up before calling this
  const renderTestApp = () => {
    const { lastFrame, unmount, stdin } = render(
      <App
        config={mockConfig as unknown as ServerConfig}
        settings={mockSettings}
      />,
    );
    currentUnmount = unmount;
    return { lastFrame, stdin };
  };


  it('should display default "GEMINI.md" in footer when contextFileName is not set and count is 1', async () => {
    mockConfig.getGeminiMdFileCount.mockReturnValue(1);
    // For this test, ensure showMemoryUsage is false or debugMode is false if it relies on that
    mockConfig.getDebugMode.mockReturnValue(false);
    mockConfig.getShowMemoryUsage.mockReturnValue(false);

    const { lastFrame } = renderTestApp();
    await Promise.resolve(); // Wait for any async updates
    expect(lastFrame()).toContain('Using 1 GEMINI.md file');
  });

  it('should display default "GEMINI.md" with plural when contextFileName is not set and count is > 1', async () => {
    mockConfig.getGeminiMdFileCount.mockReturnValue(2);
    mockConfig.getDebugMode.mockReturnValue(false);
    mockConfig.getShowMemoryUsage.mockReturnValue(false);

    const { lastFrame } = renderTestApp();
    await Promise.resolve();
    expect(lastFrame()).toContain('Using 2 GEMINI.md files');
  });

  it('should display custom contextFileName in footer when set and count is 1', async () => {
    mockSettings = createMockSettings({
      contextFileName: 'AGENTS.md',
      theme: 'Default',
    });
    mockConfig.getGeminiMdFileCount.mockReturnValue(1);
    mockConfig.getDebugMode.mockReturnValue(false);
    mockConfig.getShowMemoryUsage.mockReturnValue(false);

    const { lastFrame } = renderTestApp();
    await Promise.resolve();
    expect(lastFrame()).toContain('Using 1 AGENTS.md file');
  });

  it('should display a generic message when multiple context files with different names are provided', async () => {
    mockSettings = createMockSettings({
      contextFileName: ['AGENTS.md', 'CONTEXT.md'],
      theme: 'Default',
    });
    mockConfig.getGeminiMdFileCount.mockReturnValue(2);
    mockConfig.getDebugMode.mockReturnValue(false);
    mockConfig.getShowMemoryUsage.mockReturnValue(false);

    const { lastFrame } = renderTestApp();
    await Promise.resolve();
    expect(lastFrame()).toContain('Using 2 context files');
  });

  it('should display custom contextFileName with plural when set and count is > 1', async () => {
    mockSettings = createMockSettings({
      contextFileName: 'MY_NOTES.TXT',
      theme: 'Default',
    });
    mockConfig.getGeminiMdFileCount.mockReturnValue(3);
    mockConfig.getDebugMode.mockReturnValue(false);
    mockConfig.getShowMemoryUsage.mockReturnValue(false);

    const { lastFrame } = renderTestApp();
    await Promise.resolve();
    expect(lastFrame()).toContain('Using 3 MY_NOTES.TXT files');
  });

  it('should not display context file message if count is 0, even if contextFileName is set', async () => {
    mockSettings = createMockSettings({
      contextFileName: 'ANY_FILE.MD',
      theme: 'Default',
    });
    mockConfig.getGeminiMdFileCount.mockReturnValue(0);
    mockConfig.getDebugMode.mockReturnValue(false);
    mockConfig.getShowMemoryUsage.mockReturnValue(false);

    const { lastFrame } = renderTestApp();
    await Promise.resolve();
    expect(lastFrame()).not.toContain('ANY_FILE.MD');
  });

  it('should display GEMINI.md and MCP server count when both are present', async () => {
    mockConfig.getGeminiMdFileCount.mockReturnValue(2);
    mockConfig.getMcpServers.mockReturnValue({
      server1: {} as MCPServerConfig,
    });
    mockConfig.getDebugMode.mockReturnValue(false);
    mockConfig.getShowMemoryUsage.mockReturnValue(false);

    const { lastFrame } = renderTestApp();
    await Promise.resolve();
    expect(lastFrame()).toContain('server');
  });

  it('should display only MCP server count when GEMINI.md count is 0', async () => {
    mockConfig.getGeminiMdFileCount.mockReturnValue(0);
    mockConfig.getMcpServers.mockReturnValue({
      server1: {} as MCPServerConfig,
      server2: {} as MCPServerConfig,
    });
    mockConfig.getDebugMode.mockReturnValue(false);
    mockConfig.getShowMemoryUsage.mockReturnValue(false);

    const { lastFrame } = renderTestApp();
    await Promise.resolve();
    expect(lastFrame()).toContain('Using 2 MCP servers');
  });


  // Screenshot related tests
  // We need to mock or intercept the useInput hook's callback for these tests
  // as simulating Ctrl+O via stdin.write is unreliable for global handlers.
  // For now, these tests will focus on the state changes *after* the capture logic is invoked.

  describe('Screenshot Functionality (Ctrl+O)', () => {
    // Mock the useInput hook to allow invoking its handler
    let capturedUseInputHandler: (input: string, key: InkKeyType) => void = () => {};
    const mockUseInput = vi.fn();

    beforeEach(() => {
      vi.doMock('ink', async () => {
        const actualInk = await vi.importActual<typeof import('ink')>('ink');
        return {
          ...actualInk,
          useInput: (handler: (input: string, key: InkKeyType) => void) => {
            capturedUseInputHandler = handler; // Capture the handler
            mockUseInput(handler); // Call the mock so we can assert it was called
            return actualInk.useInput(handler); // Return the actual hook for App to use
          },
        };
      });
      // Reset mocks that might have been set at the top level of the describe block
      mockedCaptureScreenshot.mockReset();
      // Default mock settings for screenshot tests
      mockSettings = createMockSettings({ theme: 'Default', autoConfigureMaxOldSpaceSize: false });
      // Ensure useHistory's addItem is mocked for assertions
      const { useHistory } = await import('./hooks/useHistoryManager.js');
      (useHistory as vi.Mock).mockReturnValue({
        history: [],
        addItem: vi.fn(),
        clearItems: vi.fn(),
        loadHistory: vi.fn(),
      });
    });

    afterEach(async () => {
      vi.resetModules(); // Important to reset modules to un-mock 'ink' for other tests
    });

    it('should call captureScreenshotAndGetImageData and display success message on Ctrl+O', async () => {
      const mockScreenshotPayload = { inline_data: { mime_type: 'image/png', data: 'testimgdata' } };
      mockedCaptureScreenshot.mockResolvedValue(mockScreenshotPayload);

      const { lastFrame } = renderTestApp();

      // Simulate the Ctrl+O key press by directly invoking the captured handler
      // Wait for next tick to allow effects to run if any before key press
      await new Promise(resolve => setTimeout(resolve, 0));
      capturedUseInputHandler('o', { ctrl: true, meta: false, shift: false, name: 'o' });

      expect(mockedCaptureScreenshot).toHaveBeenCalledTimes(1);

      // Check for "Capturing screenshot..." immediately (might be too fast to catch)
      // Then wait for the promise to resolve
      await new Promise(resolve => setTimeout(resolve, 0)); // Allow state updates

      const { useHistory } = await import('./hooks/useHistoryManager.js');
      const addItemMock = (useHistory as vi.Mock)().addItem;
      expect(addItemMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'info', text: expect.stringContaining('Screenshot captured') }),
        expect.any(Number)
      );
      expect(lastFrame()).toContain('Screenshot attached');
    });

    it('should display error message if captureScreenshotAndGetImageData fails on Ctrl+O', async () => {
      const errorMessage = 'Screenshot failed miserably';
      mockedCaptureScreenshot.mockRejectedValue(new Error(errorMessage));

      const { lastFrame } = renderTestApp();

      await new Promise(resolve => setTimeout(resolve, 0));
      capturedUseInputHandler('o', { ctrl: true, meta: false, shift: false, name: 'o' });

      expect(mockedCaptureScreenshot).toHaveBeenCalledTimes(1);

      await new Promise(resolve => setTimeout(resolve, 0)); // Allow state updates

      const { useHistory } = await import('./hooks/useHistoryManager.js');
      const addItemMock = (useHistory as vi.Mock)().addItem;

      expect(addItemMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', text: expect.stringContaining(errorMessage) }),
        expect.any(Number)
      );
      expect(lastFrame()).toContain(errorMessage);
      expect(lastFrame()).not.toContain('Screenshot attached');
    });
  });


  describe('when no theme is set', () => {
    let originalNoColor: string | undefined;

    beforeEach(() => {
      originalNoColor = process.env.NO_COLOR;
      // Ensure no theme is set for these tests
      mockSettings = createMockSettings({});
      mockConfig.getDebugMode.mockReturnValue(false);
      mockConfig.getShowMemoryUsage.mockReturnValue(false);
    });

    afterEach(() => {
      process.env.NO_COLOR = originalNoColor;
    });

    it('should display theme dialog if NO_COLOR is not set', async () => {
      delete process.env.NO_COLOR;
      mockSettings = createMockSettings({ autoConfigureMaxOldSpaceSize: false }); // No theme


      const { lastFrame } = renderTestApp();
      expect(lastFrame()).toContain('Select Theme');
    });

    it('should display a message if NO_COLOR is set', async () => {
      process.env.NO_COLOR = 'true';
      mockSettings = createMockSettings({ autoConfigureMaxOldSpaceSize: false }); // No theme

      const { lastFrame } = renderTestApp();

      expect(lastFrame()).toContain(
        'Theme configuration unavailable due to NO_COLOR env variable.',
      );
      expect(lastFrame()).not.toContain('Select Theme');
    });
  });
});
