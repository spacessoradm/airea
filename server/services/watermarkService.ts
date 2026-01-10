import sharp from 'sharp';
import { Buffer } from 'buffer';

export interface WatermarkOptions {
  agentName: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
  opacity?: number;
  fontSize?: number;
}

export class WatermarkService {
  async addWatermark(
    imageBuffer: Buffer,
    options: WatermarkOptions
  ): Promise<Buffer> {
    const {
      agentName,
      position = 'center',
      opacity = 0.15,
      fontSize = 32
    } = options;

    try {
      // Get image metadata to determine dimensions
      const metadata = await sharp(imageBuffer).metadata();
      const width = metadata.width || 800;
      const height = metadata.height || 600;

      // Create SVG watermark with agent name
      const svgWatermark = this.createSVGWatermark(
        agentName,
        width,
        height,
        fontSize,
        opacity
      );

      // Determine gravity based on position
      const gravity = this.getGravity(position);

      // Add watermark to image
      const watermarkedImage = await sharp(imageBuffer)
        .composite([{
          input: Buffer.from(svgWatermark),
          gravity: gravity,
          blend: 'over'
        }])
        .toBuffer();

      return watermarkedImage;
    } catch (error) {
      console.error('Error adding watermark:', error);
      throw new Error('Failed to add watermark to image');
    }
  }

  private createSVGWatermark(
    text: string,
    imageWidth: number,
    imageHeight: number,
    fontSize: number,
    opacity: number
  ): string {
    // Calculate dimensions for the watermark text with letter spacing
    // Account for letter-spacing of 3px and add extra padding
    const letterSpacing = 3;
    const estimatedTextWidth = text.length * fontSize * 0.7; // Base width
    const letterSpacingWidth = (text.length - 1) * letterSpacing; // Total letter spacing
    const padding = fontSize * 0.5; // Extra padding on sides
    const boxWidth = estimatedTextWidth + letterSpacingWidth + padding;
    const boxHeight = fontSize * 2;

    // Create a subtle watermark without background box
    return `
      <svg width="${boxWidth}" height="${boxHeight}">
        <text
          x="${boxWidth / 2}"
          y="${boxHeight / 2 + fontSize * 0.35}"
          text-anchor="middle"
          font-family="Arial, sans-serif"
          font-size="${fontSize}"
          font-weight="300"
          letter-spacing="${letterSpacing}"
          fill="white"
          fill-opacity="${opacity}"
        >${this.escapeXml(text)}</text>
      </svg>
    `;
  }

  private getGravity(position: string): string {
    const gravityMap: Record<string, string> = {
      'bottom-right': 'southeast',
      'bottom-left': 'southwest',
      'top-right': 'northeast',
      'top-left': 'northwest',
      'center': 'center'
    };
    return gravityMap[position] || 'southeast';
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export const watermarkService = new WatermarkService();
