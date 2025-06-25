/**
 * Live2D Core 类型声明
 */

declare global {
  const Live2DCubismCore: {
    Logging: {
      csmSetLogFunction: (logFunction: (message: string) => void) => void;
    };
    Version: {
      csmGetVersion: () => number;
    };
    Memory: {
      initializeAmountOfMemory: (memorySize: number) => void;
    };
  };

  namespace Live2DCubismCore {
    type csmLogFunction = (message: string) => void;
  }
}

export {}; 