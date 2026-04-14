export interface RgbaColor {
    r: number;
    g: number;
    b: number;
    a: number;
}

const namedColors: Record<string, string> = {
    black: "#000000",
    silver: "#c0c0c0",
    gray: "#808080",
    white: "#ffffff",
    maroon: "#800000",
    red: "#ff0000",
    purple: "#800080",
    fuchsia: "#ff00ff",
    green: "#008000",
    lime: "#00ff00",
    olive: "#808000",
    yellow: "#ffff00",
    navy: "#000080",
    blue: "#0000ff",
    teal: "#008080",
    aqua: "#00ffff",
    orange: "#ffa500",
    transparent: "#00000000"
};

function clampChannel(value: number): number {
    return Math.max(0, Math.min(255, Math.round(value)));
}

function hslToRgb(h: number, s: number, l: number): RgbaColor {
    const hue = ((h % 360) + 360) % 360;
    const saturation = Math.max(0, Math.min(1, s));
    const lightness = Math.max(0, Math.min(1, l));

    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = lightness - chroma / 2;

    let rPrime = 0;
    let gPrime = 0;
    let bPrime = 0;

    if (hue < 60) {
        rPrime = chroma;
        gPrime = x;
    } else if (hue < 120) {
        rPrime = x;
        gPrime = chroma;
    } else if (hue < 180) {
        gPrime = chroma;
        bPrime = x;
    } else if (hue < 240) {
        gPrime = x;
        bPrime = chroma;
    } else if (hue < 300) {
        rPrime = x;
        bPrime = chroma;
    } else {
        rPrime = chroma;
        bPrime = x;
    }

    return {
        r: clampChannel((rPrime + m) * 255),
        g: clampChannel((gPrime + m) * 255),
        b: clampChannel((bPrime + m) * 255),
        a: 1
    };
}

function parseRgbChannels(text: string): number[] | null {
    const parts = text.split(",").map((part) => part.trim());
    if (parts.length < 3 || parts.length > 4) {
        return null;
    }
    const channels: number[] = [];
    for (let index = 0; index < parts.length; index += 1) {
        const value = parts[index] as string;
        if (index < 3) {
            if (value.endsWith("%")) {
                const percentage = Number(value.slice(0, -1));
                if (!Number.isFinite(percentage)) return null;
                channels.push(clampChannel((percentage / 100) * 255));
            } else {
                const numeric = Number(value);
                if (!Number.isFinite(numeric)) return null;
                channels.push(clampChannel(numeric));
            }
        } else {
            const alpha = Number(value);
            if (!Number.isFinite(alpha)) return null;
            channels.push(Math.max(0, Math.min(1, alpha)));
        }
    }
    return channels;
}

function parseHslChannels(text: string): number[] | null {
    const parts = text.split(",").map((part) => part.trim());
    if (parts.length < 3 || parts.length > 4) {
        return null;
    }
    const h = Number(parts[0]?.replace("deg", ""));
    const s = Number(parts[1]?.replace("%", "")) / 100;
    const l = Number(parts[2]?.replace("%", "")) / 100;
    if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) {
        return null;
    }
    const alpha = parts[3] ? Number(parts[3]) : 1;
    if (!Number.isFinite(alpha)) {
        return null;
    }
    return [h, s, l, Math.max(0, Math.min(1, alpha))];
}

export function parseCssColor(input: string | undefined): RgbaColor | null {
    if (!input) {
        return null;
    }
    const raw = input.trim().toLowerCase();
    const normalized = namedColors[raw] ?? raw;

    if (normalized.startsWith("#")) {
        const hex = normalized.slice(1);
        if (hex.length === 3 || hex.length === 4) {
            const r = Number.parseInt(hex[0] + hex[0], 16);
            const g = Number.parseInt(hex[1] + hex[1], 16);
            const b = Number.parseInt(hex[2] + hex[2], 16);
            const a = hex.length === 4 ? Number.parseInt(hex[3] + hex[3], 16) / 255 : 1;
            return { r, g, b, a };
        }
        if (hex.length === 6 || hex.length === 8) {
            const r = Number.parseInt(hex.slice(0, 2), 16);
            const g = Number.parseInt(hex.slice(2, 4), 16);
            const b = Number.parseInt(hex.slice(4, 6), 16);
            const a = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1;
            return { r, g, b, a };
        }
        return null;
    }

    const rgbMatch = normalized.match(/^rgba?\((.+)\)$/);
    if (rgbMatch) {
        const channels = parseRgbChannels(rgbMatch[1]);
        if (!channels) return null;
        return {
            r: channels[0] ?? 0,
            g: channels[1] ?? 0,
            b: channels[2] ?? 0,
            a: channels[3] ?? 1
        };
    }

    const hslMatch = normalized.match(/^hsla?\((.+)\)$/);
    if (hslMatch) {
        const channels = parseHslChannels(hslMatch[1]);
        if (!channels) return null;
        const rgb = hslToRgb(channels[0] ?? 0, channels[1] ?? 0, channels[2] ?? 0);
        return { ...rgb, a: channels[3] ?? 1 };
    }

    return null;
}

export function formatColor(color: RgbaColor): string {
    if (color.a < 1) {
        return `rgba(${color.r}, ${color.g}, ${color.b}, ${Number(color.a.toFixed(3))})`;
    }
    return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

export function relativeLuminance(color: RgbaColor): number {
    const convert = (channel: number) => {
        const normalized = channel / 255;
        return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
    };

    return 0.2126 * convert(color.r) + 0.7152 * convert(color.g) + 0.0722 * convert(color.b);
}

export function contrastRatio(foreground: RgbaColor, background: RgbaColor): number {
    const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
    const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
    return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(3));
}
