declare module 'html5-qrcode' {
  export class Html5Qrcode {
    constructor(elementId: string);
    
    static getCameras(): Promise<Array<{id: string, label: string}>>;
    
    start(
      cameraId: string,
      config: {
        fps: number;
        qrbox: { width: number; height: number };
        aspectRatio?: number;
        facingMode?: string;
      },
      onScanSuccess: (decodedText: string, decodedResult: any) => void,
      onScanFailure: (error: string) => void
    ): Promise<void>;
    
    stop(): Promise<void>;
  }
}
