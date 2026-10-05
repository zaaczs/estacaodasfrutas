declare module "qz-tray" {
  export interface QzPrintData {
    type?: string;
    format?: string;
    flavor?: string;
    data?: string | Uint8Array;
  }

  export interface QzConfigOptions {
    jobName?: string | null;
    rasterize?: boolean;
    scaleContent?: boolean;
    copies?: number;
  }

  export interface QzConfig {
    setPrinter: (printer: string) => void;
  }

  export interface QzApi {
    websocket: {
      isActive: () => boolean;
      connect: (options?: { retries?: number; delay?: number }) => Promise<null | void>;
    };
    printers: {
      find: (query?: string) => Promise<string[] | string>;
    };
    configs: {
      create: (printer: string, options?: QzConfigOptions) => QzConfig;
    };
    print: (config: QzConfig, data: QzPrintData[]) => Promise<null | void>;
  }

  const qz: QzApi;
  export default qz;
}
