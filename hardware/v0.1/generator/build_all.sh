#!/bin/zsh
# 一键生成：原理图 → PCB → 检查 → 导出（SVG/PDF/GLB/渲染图/嘉立创文件）
set -e
SRC=${0:A:h}
OUT=${1:?输出目录}
K=~/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli
P=~/Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/Versions/3.9/bin/python3.9
export KICAD10_3DMODEL_DIR=~/Applications/KiCad/KiCad.app/Contents/SharedSupport/3dmodels
rm -rf "$OUT/kicad" "$OUT/exports"; mkdir -p "$OUT/kicad" "$OUT/exports"
cd "$SRC" && python3 gen_sch.py "$OUT/kicad"
for b in mcu_board main_board; do
  D="$OUT/kicad/$b"; E="$OUT/exports/$b"; mkdir -p "$E/jlcpcb/gerber"
  $P gen_pcb.py "$D" 2>&1 | grep -v assert
  $K sch erc -o "$E/erc.rpt" "$D/$b.kicad_sch" >/dev/null
  $K pcb drc -o "$E/drc.rpt" "$D/$b.kicad_pcb" >/dev/null
  $K sch export svg -o "$E" "$D/$b.kicad_sch" >/dev/null
  $K sch export pdf -o "$E/$b-schematic.pdf" "$D/$b.kicad_sch" >/dev/null
  $K pcb export glb --include-pads --include-zones --include-silkscreen --include-soldermask --subst-models -f -o "$E/$b.glb" "$D/$b.kicad_pcb" >/dev/null 2>&1
  for s in top bottom; do $K pcb render --side $s --width 2000 --height 1200 --quality high --zoom 1.15 -o "$E/render_$s.png" "$D/$b.kicad_pcb" >/dev/null 2>&1; done
  $K pcb export gerbers -o "$E/jlcpcb/gerber/" "$D/$b.kicad_pcb" >/dev/null
  $K pcb export drill --format excellon -o "$E/jlcpcb/gerber/" "$D/$b.kicad_pcb" >/dev/null
  $K pcb export pos --format csv --units mm --side both -o "$E/jlcpcb/kicad-pos.csv" "$D/$b.kicad_pcb" >/dev/null
  $K sch export bom --fields 'Value,Reference,Footprint,${QUANTITY},${DNP}' --labels 'Comment,Designator,Footprint,Qty,DNP' --group-by 'Value,Footprint' -o "$E/jlcpcb/kicad-bom.csv" "$D/$b.kicad_sch" >/dev/null
  python3 "$SRC/jlc.py" "$E/jlcpcb"
  (cd "$E/jlcpcb" && rm -f "${b}-gerber.zip" && zip -qj "${b}-gerber.zip" gerber/*)
  echo "$b: ERC $(grep -cE '^\[' $E/erc.rpt) 条，DRC $(grep -E 'Found [0-9]+ DRC' $E/drc.rpt | grep -oE '[0-9]+') 条，未连线焊盘 $(grep -E 'unconnected pads' $E/drc.rpt | grep -oE '[0-9]+')"
done
