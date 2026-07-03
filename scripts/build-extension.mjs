import { build } from "esbuild";

await build({
  entryPoints: ["FFweb2NAS/src/contentScript.js", "FFweb2NAS/src/background.js"],
  bundle: true,
  outdir: "FFweb2NAS/dist",
  format: "iife",
  target: ["chrome114", "edge114"]
});
