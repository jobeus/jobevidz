declare module 'yt-dlp-wrap' {
  export interface VideoInfo {
    title?: string;
    description?: string;
    uploader?: string;
    channel?: string;
    duration?: number;
    width?: number;
    height?: number;
    ext?: string;
    url?: string;
    thumbnail?: string;
    upload_date?: string;
    format_id?: string;
    format?: string;
    filesize?: number;
    [key: string]: any;
  }

  export default class YTDlpWrap {
    constructor(binaryPath?: string);
    
    getVideoInfo(url: string): Promise<VideoInfo>;
    
    execPromise(args: string[]): Promise<string>;
    
    exec(args: string[], options?: any, callback?: (error: Error | null, stdout?: string, stderr?: string) => void): any;
  }
}
