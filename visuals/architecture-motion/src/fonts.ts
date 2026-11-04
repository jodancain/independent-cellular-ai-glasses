// 视频渲染时加载与网站一致的字体（headless Chrome 本机没有 Barlow / 思源黑体）
import { loadFont as loadBarlow } from "@remotion/google-fonts/Barlow";
import { loadFont as loadNotoSC } from "@remotion/google-fonts/NotoSansSC";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

loadBarlow("normal", { weights: ["300", "400", "500"], subsets: ["latin"] });
loadNotoSC("normal", { weights: ["400", "500", "700"] });
loadMono("normal", { weights: ["400"], subsets: ["latin"] });
