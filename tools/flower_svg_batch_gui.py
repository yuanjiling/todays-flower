from __future__ import annotations

import re
import tkinter as tk
from dataclasses import dataclass
from pathlib import Path
from tkinter import filedialog, messagebox, ttk


SVG_TAG_RE = re.compile(r"<svg\b[^>]*>([\s\S]*?)</svg>", re.IGNORECASE)
VIEW_BOX_RE = re.compile(r"<svg\b[^>]*viewBox=([\"'])([^\"']+)\1", re.IGNORECASE)
STYLE_TAG_RE = re.compile(r"<style\b[^>]*>([\s\S]*?)</style>", re.IGNORECASE)
EMPTY_DEFS_RE = re.compile(r"<defs\b[^>]*>\s*</defs>", re.IGNORECASE)
OPEN_TAG_RE = re.compile(r"<([A-Za-z][\w:.-]*)(\s[^<>]*?)?(/?)>")
ATTR_RE = re.compile(r"([:@\w.-]+)(?:\s*=\s*(\"([^\"]*)\"|'([^']*)'))?")
CSS_RULE_RE = re.compile(r"([^{}]+)\{([^{}]+)\}")
NUMBER_RE = re.compile(r"-?\d*\.?\d+(?:e[-+]?\d+)?", re.IGNORECASE)
PATH_TOKEN_RE = re.compile(r"[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?", re.IGNORECASE)
PATH_PARAM_COUNT = {
    "M": 2,
    "L": 2,
    "H": 1,
    "V": 1,
    "C": 6,
    "S": 4,
    "Q": 4,
    "T": 2,
    "A": 7,
}

ATTRIBUTE_NAME_MAP = {
    "clip-path": "clipPath",
    "clip-rule": "clipRule",
    "fill-opacity": "fillOpacity",
    "fill-rule": "fillRule",
    "flood-color": "floodColor",
    "flood-opacity": "floodOpacity",
    "font-family": "fontFamily",
    "font-size": "fontSize",
    "font-style": "fontStyle",
    "font-weight": "fontWeight",
    "mask-type": "maskType",
    "stop-color": "stopColor",
    "stop-opacity": "stopOpacity",
    "stroke-dasharray": "strokeDasharray",
    "stroke-dashoffset": "strokeDashoffset",
    "stroke-linecap": "strokeLinecap",
    "stroke-linejoin": "strokeLinejoin",
    "stroke-miterlimit": "strokeMiterlimit",
    "stroke-opacity": "strokeOpacity",
    "stroke-width": "strokeWidth",
    "text-anchor": "textAnchor",
    "vector-effect": "vectorEffect",
    "xlink:href": "xlinkHref",
    "xml:space": "xmlSpace",
}

REMOVED_ATTRIBUTES = {
    "class",
    "data-name",
    "version",
    "xmlns",
    "xmlns:xlink",
}

STAGES = {
    "stem": {
        "component": "FlowerStem",
        "aliases": ["stem", "branch", "stalk", "flowerstem", "flower-stem", "花枝", "花茎", "枝", "茎"],
    },
    "bud": {
        "component": "FlowerBud",
        "aliases": ["bud", "flowerbud", "flower-bud", "苞", "花苞"],
    },
    "bloom": {
        "component": "FlowerBloom",
        "aliases": ["bloom", "open", "opened", "flower", "flowerbloom", "flower-bloom", "开放", "开花", "花朵", "盛开"],
    },
}

VARIANTS = {
    "todo-1": ["todo-1", "todo1", "task-1", "task1", "importance-1", "importance1", "important-1", "imp1", "t1", "任务1", "重要1"],
    "todo-2": ["todo-2", "todo2", "task-2", "task2", "importance-2", "importance2", "important-2", "imp2", "t2", "任务2", "重要2"],
    "todo-3": ["todo-3", "todo3", "task-3", "task3", "importance-3", "importance3", "important-3", "imp3", "t3", "任务3", "重要3"],
    "grass-1": ["grass-1", "grass1", "wish-1", "wish1", "interest-1", "interest1", "g1", "愿望1", "兴趣1", "种草1"],
    "grass-2": ["grass-2", "grass2", "wish-2", "wish2", "interest-2", "interest2", "g2", "愿望2", "兴趣2", "种草2"],
    "grass-3": ["grass-3", "grass3", "wish-3", "wish3", "interest-3", "interest3", "g3", "愿望3", "兴趣3", "种草3"],
}


@dataclass(frozen=True)
class Target:
    variant: str
    stage: str

    @property
    def output_name(self) -> str:
        return f"{self.stage}.tsx"

    @property
    def component_name(self) -> str:
        return STAGES[self.stage]["component"]


TARGETS = [Target(variant, stage) for variant in VARIANTS for stage in STAGES]


def normalize_path_text(value: str) -> str:
    normalized = value.lower()
    normalized = normalized.replace("_", "-").replace(" ", "-")
    return normalized


def camel_case_attr(name: str) -> str:
    return re.sub(r"-([a-z])", lambda match: match.group(1).upper(), name)


def normalize_attr_name(name: str) -> str:
    lowered = name.lower()
    if lowered in ATTRIBUTE_NAME_MAP:
        return ATTRIBUTE_NAME_MAP[lowered]
    if lowered == "classname":
        return "className"
    return camel_case_attr(lowered) if "-" in lowered else name


def parse_css_declarations(body: str) -> dict[str, str]:
    declarations: dict[str, str] = {}
    for raw_declaration in body.split(";"):
        declaration = raw_declaration.strip()
        if not declaration or ":" not in declaration:
            continue
        prop, value = declaration.split(":", 1)
        prop = prop.strip().lower()
        value = value.strip()
        if prop and value:
            declarations[normalize_attr_name(prop)] = value
    return declarations


def extract_class_style_map(svg_source: str) -> dict[str, dict[str, str]]:
    class_style_map: dict[str, dict[str, str]] = {}
    for style_match in STYLE_TAG_RE.finditer(svg_source):
        css_body = re.sub(r"/\*[\s\S]*?\*/", "", style_match.group(1) or "")
        for rule in CSS_RULE_RE.finditer(css_body):
            selectors = [selector.strip() for selector in rule.group(1).split(",") if selector.strip()]
            declarations = parse_css_declarations(rule.group(2) or "")
            for selector in selectors:
                if not selector.startswith("."):
                    continue
                class_name = selector[1:]
                class_style_map[class_name] = {
                    **class_style_map.get(class_name, {}),
                    **declarations,
                }
    return class_style_map


def numbers_from_text(text: str) -> list[float]:
    values: list[float] = []
    for match in NUMBER_RE.finditer(text):
        try:
            values.append(float(match.group(0)))
        except ValueError:
            pass
    return values


def is_path_command(token: str) -> bool:
    return bool(re.fullmatch(r"[a-zA-Z]", token))


def tokenize_path(path_data: str) -> list[str]:
    return [match.group(0) for match in PATH_TOKEN_RE.finditer(path_data)]


def get_path_points(path_data: str) -> list[tuple[float, float]]:
    tokens = tokenize_path(path_data)
    points: list[tuple[float, float]] = []
    index = 0
    command: str | None = None
    x = 0.0
    y = 0.0
    subpath_x = 0.0
    subpath_y = 0.0

    while index < len(tokens):
        if is_path_command(tokens[index]):
            command = tokens[index]
            index += 1

        if command is None:
            break

        upper_command = command.upper()
        is_relative = command != upper_command

        if upper_command == "Z":
            x = subpath_x
            y = subpath_y
            points.append((x, y))
            command = None
            continue

        param_count = PATH_PARAM_COUNT.get(upper_command)
        if not param_count or index + param_count > len(tokens):
            break

        try:
            params = [float(tokens[index + offset]) for offset in range(param_count)]
        except ValueError:
            break
        index += param_count

        if upper_command == "M":
            x = x + params[0] if is_relative else params[0]
            y = y + params[1] if is_relative else params[1]
            subpath_x = x
            subpath_y = y
            points.append((x, y))
            command = "l" if is_relative else "L"
            continue

        if upper_command == "L":
            x = x + params[0] if is_relative else params[0]
            y = y + params[1] if is_relative else params[1]
            points.append((x, y))
            continue

        if upper_command == "H":
            x = x + params[0] if is_relative else params[0]
            points.append((x, y))
            continue

        if upper_command == "V":
            y = y + params[0] if is_relative else params[0]
            points.append((x, y))
            continue

        if upper_command == "C":
            c1 = (x + params[0] if is_relative else params[0], y + params[1] if is_relative else params[1])
            c2 = (x + params[2] if is_relative else params[2], y + params[3] if is_relative else params[3])
            x = x + params[4] if is_relative else params[4]
            y = y + params[5] if is_relative else params[5]
            points.extend([c1, c2, (x, y)])
            continue

        if upper_command in {"S", "Q"}:
            local_points: list[tuple[float, float]] = []
            for param_index in range(0, len(params), 2):
                local_points.append((
                    x + params[param_index] if is_relative else params[param_index],
                    y + params[param_index + 1] if is_relative else params[param_index + 1],
                ))
            points.extend(local_points)
            x, y = local_points[-1]
            continue

        if upper_command == "T":
            x = x + params[0] if is_relative else params[0]
            y = y + params[1] if is_relative else params[1]
            points.append((x, y))
            continue

        if upper_command == "A":
            x = x + params[5] if is_relative else params[5]
            y = y + params[6] if is_relative else params[6]
            rx = abs(params[0])
            ry = abs(params[1])
            points.extend([(x - rx, y - ry), (x + rx, y + ry), (x, y)])

    return points


def add_point(bounds: dict[str, float], x: float, y: float) -> None:
    bounds["minX"] = min(bounds["minX"], x)
    bounds["minY"] = min(bounds["minY"], y)
    bounds["maxX"] = max(bounds["maxX"], x)
    bounds["maxY"] = max(bounds["maxY"], y)


def add_rect(bounds: dict[str, float], x: float, y: float, width: float, height: float) -> None:
    add_point(bounds, x, y)
    add_point(bounds, x + width, y + height)


def parse_element_attrs(tag_text: str) -> dict[str, str | bool]:
    return dict(parse_attrs(tag_text))


def get_numeric_attr(attrs: dict[str, str | bool], name: str, fallback: float = 0) -> float:
    value = attrs.get(name)
    if not isinstance(value, str):
        return fallback
    try:
        return float(value)
    except ValueError:
        return fallback


def estimate_svg_bounds(svg_content: str, view_box: str | None) -> dict[str, float]:
    bounds = {
        "minX": float("inf"),
        "minY": float("inf"),
        "maxX": float("-inf"),
        "maxY": float("-inf"),
    }

    for match in re.finditer(r"<path\b[^>]*\bd=([\"'])([\s\S]*?)\1[^>]*>", svg_content, re.IGNORECASE):
        for x, y in get_path_points(match.group(2)):
            add_point(bounds, x, y)

    for match in re.finditer(r"<rect\b([^>]*)>", svg_content, re.IGNORECASE):
        attrs = parse_element_attrs(match.group(1) or "")
        add_rect(
            bounds,
            get_numeric_attr(attrs, "x"),
            get_numeric_attr(attrs, "y"),
            get_numeric_attr(attrs, "width"),
            get_numeric_attr(attrs, "height"),
        )

    for match in re.finditer(r"<circle\b([^>]*)>", svg_content, re.IGNORECASE):
        attrs = parse_element_attrs(match.group(1) or "")
        cx = get_numeric_attr(attrs, "cx")
        cy = get_numeric_attr(attrs, "cy")
        r = get_numeric_attr(attrs, "r")
        add_rect(bounds, cx - r, cy - r, r * 2, r * 2)

    for match in re.finditer(r"<ellipse\b([^>]*)>", svg_content, re.IGNORECASE):
        attrs = parse_element_attrs(match.group(1) or "")
        cx = get_numeric_attr(attrs, "cx")
        cy = get_numeric_attr(attrs, "cy")
        rx = get_numeric_attr(attrs, "rx")
        ry = get_numeric_attr(attrs, "ry")
        add_rect(bounds, cx - rx, cy - ry, rx * 2, ry * 2)

    for match in re.finditer(r"<line\b([^>]*)>", svg_content, re.IGNORECASE):
        attrs = parse_element_attrs(match.group(1) or "")
        add_point(bounds, get_numeric_attr(attrs, "x1"), get_numeric_attr(attrs, "y1"))
        add_point(bounds, get_numeric_attr(attrs, "x2"), get_numeric_attr(attrs, "y2"))

    for match in re.finditer(r"<(?:polyline|polygon)\b[^>]*\bpoints=([\"'])([\s\S]*?)\1[^>]*>", svg_content, re.IGNORECASE):
        values = numbers_from_text(match.group(2))
        for index in range(0, len(values) - 1, 2):
            add_point(bounds, values[index], values[index + 1])

    if all(value not in (float("inf"), float("-inf")) for value in bounds.values()):
        return bounds

    view_box_values = numbers_from_text(view_box or "")
    if len(view_box_values) >= 4:
        return {
            "minX": view_box_values[0],
            "minY": view_box_values[1],
            "maxX": view_box_values[0] + view_box_values[2],
            "maxY": view_box_values[1] + view_box_values[3],
        }

    return {"minX": 0, "minY": 0, "maxX": 60, "maxY": 40}


def format_bounds(bounds: dict[str, float]) -> str:
    def rounded(value: float) -> str:
        return f"{value:.3f}".rstrip("0").rstrip(".")

    return (
        "{ "
        f"minX: {rounded(bounds['minX'])}, "
        f"minY: {rounded(bounds['minY'])}, "
        f"maxX: {rounded(bounds['maxX'])}, "
        f"maxY: {rounded(bounds['maxY'])}"
        " }"
    )


def parse_attrs(attribute_text: str) -> list[tuple[str, str | bool]]:
    attrs: list[tuple[str, str | bool]] = []
    for match in ATTR_RE.finditer(attribute_text):
        raw_name = match.group(1)
        raw_value = match.group(3) if match.group(3) is not None else match.group(4)
        attrs.append((raw_name, raw_value if raw_value is not None else True))
    return attrs


def format_style_object(style_object: dict[str, str]) -> str | None:
    if not style_object:
        return None
    body = ", ".join(f"{key}: {value!r}".replace("'", '"') for key, value in style_object.items())
    return "{{ " + body + " }}"


def build_attr_string(attrs: list[tuple[str, str | bool | dict[str, str]]]) -> str:
    parts: list[str] = []
    for name, value in attrs:
        if value is True:
            parts.append(name)
            continue
        if name == "style" and isinstance(value, dict):
            style_text = format_style_object(value)
            if style_text:
                parts.append(f"style={style_text}")
            continue
        escaped = str(value).replace("\\", "\\\\").replace('"', '\\"')
        parts.append(f'{name}="{escaped}"')
    return "" if not parts else " " + " ".join(parts)


def transform_tag(match: re.Match[str], class_style_map: dict[str, dict[str, str]]) -> str:
    tag_name = match.group(1)
    raw_attrs = match.group(2) or ""
    self_closing = match.group(3) or ""
    attr_map: dict[str, str | bool | dict[str, str]] = {}
    inline_style: dict[str, str] = {}
    class_names: list[str] = []

    for original_name, value in parse_attrs(raw_attrs):
        normalized_name = normalize_attr_name(original_name)
        if normalized_name == "style" and isinstance(value, str):
            inline_style.update(parse_css_declarations(value))
            continue
        if original_name == "class" or normalized_name == "className":
            if isinstance(value, str):
                class_names = [name for name in value.split() if name]
            continue
        if original_name in REMOVED_ATTRIBUTES:
            continue
        attr_map[normalized_name] = value

    for class_name in class_names:
        for style_name, style_value in class_style_map.get(class_name, {}).items():
            attr_map.setdefault(style_name, style_value)

    if inline_style:
        attr_map["style"] = inline_style

    return f"<{tag_name}{build_attr_string(list(attr_map.items()))}{' /' if self_closing else ''}>"


def convert_svg_to_tsx(svg_source: str, component_name: str) -> tuple[str, str | None]:
    view_box_match = VIEW_BOX_RE.search(svg_source)
    view_box = view_box_match.group(2) if view_box_match else None
    svg_content_match = SVG_TAG_RE.search(svg_source)
    if not svg_content_match:
        raise ValueError("No <svg> root found.")

    class_style_map = extract_class_style_map(svg_source)
    cleaned_content = STYLE_TAG_RE.sub("", svg_content_match.group(1))
    cleaned_content = EMPTY_DEFS_RE.sub("", cleaned_content).strip()
    bounds = estimate_svg_bounds(cleaned_content, view_box)
    jsx_content = OPEN_TAG_RE.sub(lambda match: transform_tag(match, class_style_map), cleaned_content).strip()
    body = "\n".join(f"    {line}" for line in jsx_content.splitlines())
    code = f"""export const {component_name}Bounds = {format_bounds(bounds)} as const;

export const {component_name} = () => (
  <>
{body}
  </>
);
"""
    return code, view_box


def score_file_for_target(svg_file: Path, root: Path, target: Target) -> int:
    try:
        relative_text = normalize_path_text(str(svg_file.relative_to(root)))
    except ValueError:
        relative_text = normalize_path_text(str(svg_file))
    stem_text = normalize_path_text(svg_file.stem)
    full_text = relative_text

    score = 0
    for alias in VARIANTS[target.variant]:
        normalized_alias = normalize_path_text(alias)
        if normalized_alias in full_text:
            score += 40
        if normalized_alias in stem_text:
            score += 20

    for alias in STAGES[target.stage]["aliases"]:
        normalized_alias = normalize_path_text(alias)
        if normalized_alias in full_text:
            score += 40
        if normalized_alias in stem_text:
            score += 20

    if target.variant in full_text:
        score += 40
    if f"/{target.stage}." in full_text.replace("\\", "/") or f"-{target.stage}" in full_text:
        score += 30

    return score


def find_best_matches(source_dir: Path) -> dict[Target, Path]:
    svg_files = sorted(source_dir.rglob("*.svg"))
    matches: dict[Target, Path] = {}
    used: set[Path] = set()

    scored: list[tuple[int, Target, Path]] = []
    for target in TARGETS:
        for svg_file in svg_files:
            score = score_file_for_target(svg_file, source_dir, target)
            if score > 0:
                scored.append((score, target, svg_file))

    for score, target, svg_file in sorted(scored, key=lambda item: item[0], reverse=True):
        if target in matches or svg_file in used:
            continue
        if score < 70:
            continue
        matches[target] = svg_file
        used.add(svg_file)

    return matches


class FlowerConverterApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Flower SVG to TSX")
        self.root.geometry("1040x720")

        default_output = Path(__file__).resolve().parents[1] / "src" / "assets" / "flowers"
        self.source_dir = tk.StringVar(value="")
        self.output_dir = tk.StringVar(value=str(default_output))
        self.file_vars = {target: tk.StringVar(value="") for target in TARGETS}

        self.build_ui()

    def build_ui(self) -> None:
        outer = ttk.Frame(self.root, padding=14)
        outer.pack(fill=tk.BOTH, expand=True)

        controls = ttk.Frame(outer)
        controls.pack(fill=tk.X)

        ttk.Label(controls, text="SVG folder").grid(row=0, column=0, sticky="w", padx=(0, 8), pady=4)
        ttk.Entry(controls, textvariable=self.source_dir).grid(row=0, column=1, sticky="ew", pady=4)
        ttk.Button(controls, text="Browse", command=self.choose_source_dir).grid(row=0, column=2, padx=8, pady=4)
        ttk.Button(controls, text="Auto match", command=self.auto_match).grid(row=0, column=3, pady=4)

        ttk.Label(controls, text="Output folder").grid(row=1, column=0, sticky="w", padx=(0, 8), pady=4)
        ttk.Entry(controls, textvariable=self.output_dir).grid(row=1, column=1, sticky="ew", pady=4)
        ttk.Button(controls, text="Browse", command=self.choose_output_dir).grid(row=1, column=2, padx=8, pady=4)
        ttk.Button(controls, text="Generate TSX", command=self.generate).grid(row=1, column=3, pady=4)
        controls.columnconfigure(1, weight=1)

        hint = (
            "File names can use todo-1/todo1/importance1/task1 or grass-1/interest1/wish1, "
            "plus stem/bud/bloom or 花枝/花苞/开花."
        )
        ttk.Label(outer, text=hint).pack(anchor="w", pady=(8, 10))

        canvas = tk.Canvas(outer, highlightthickness=0)
        scrollbar = ttk.Scrollbar(outer, orient=tk.VERTICAL, command=canvas.yview)
        table = ttk.Frame(canvas)
        table.bind("<Configure>", lambda event: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=table, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        headers = ["Variant", "Stage", "SVG file", ""]
        for column, header in enumerate(headers):
            ttk.Label(table, text=header).grid(row=0, column=column, sticky="w", padx=6, pady=4)

        for row, target in enumerate(TARGETS, start=1):
            ttk.Label(table, text=target.variant).grid(row=row, column=0, sticky="w", padx=6, pady=3)
            ttk.Label(table, text=target.stage).grid(row=row, column=1, sticky="w", padx=6, pady=3)
            ttk.Entry(table, textvariable=self.file_vars[target], width=92).grid(row=row, column=2, sticky="ew", padx=6, pady=3)
            ttk.Button(table, text="Browse", command=lambda t=target: self.choose_file(t)).grid(row=row, column=3, padx=6, pady=3)
        table.columnconfigure(2, weight=1)

        self.status = tk.Text(outer, height=8, wrap=tk.WORD)
        self.status.pack(fill=tk.X, pady=(10, 0))
        self.log("Ready.")

    def log(self, message: str) -> None:
        self.status.insert(tk.END, message + "\n")
        self.status.see(tk.END)

    def choose_source_dir(self) -> None:
        selected = filedialog.askdirectory(title="Choose SVG folder")
        if selected:
            self.source_dir.set(selected)

    def choose_output_dir(self) -> None:
        selected = filedialog.askdirectory(title="Choose output flower folder")
        if selected:
            self.output_dir.set(selected)

    def choose_file(self, target: Target) -> None:
        initial_dir = self.source_dir.get() or str(Path.home())
        selected = filedialog.askopenfilename(
            title=f"Choose {target.variant} {target.stage}.svg",
            initialdir=initial_dir,
            filetypes=[("SVG files", "*.svg"), ("All files", "*.*")],
        )
        if selected:
            self.file_vars[target].set(selected)

    def auto_match(self) -> None:
        source = Path(self.source_dir.get())
        if not source.exists() or not source.is_dir():
            messagebox.showerror("Invalid folder", "Choose a valid SVG folder first.")
            return

        matches = find_best_matches(source)
        for target, svg_file in matches.items():
            self.file_vars[target].set(str(svg_file))

        self.log(f"Auto matched {len(matches)} / {len(TARGETS)} files.")
        missing = [f"{target.variant}/{target.stage}" for target in TARGETS if target not in matches]
        if missing:
            self.log("Missing: " + ", ".join(missing))

    def generate(self) -> None:
        output_root = Path(self.output_dir.get())
        generated = 0
        errors: list[str] = []

        for target in TARGETS:
            input_text = self.file_vars[target].get().strip()
            if not input_text:
                continue

            input_path = Path(input_text)
            if not input_path.exists():
                errors.append(f"{target.variant}/{target.stage}: file not found")
                continue

            try:
                svg_source = input_path.read_text(encoding="utf-8")
                tsx_code, view_box = convert_svg_to_tsx(svg_source, target.component_name)
                output_path = output_root / target.variant / target.output_name
                output_path.parent.mkdir(parents=True, exist_ok=True)
                output_path.write_text(tsx_code, encoding="utf-8")
                generated += 1
                self.log(f"Generated {output_path}  viewBox={view_box or 'unknown'}")
            except Exception as exc:
                errors.append(f"{target.variant}/{target.stage}: {exc}")

        if errors:
            self.log("Errors:")
            for error in errors:
                self.log("  " + error)
            messagebox.showwarning("Generated with errors", f"Generated {generated} files, {len(errors)} errors.")
            return

        messagebox.showinfo("Done", f"Generated {generated} TSX files.")
        self.log(f"Done. Generated {generated} files.")


def main() -> None:
    root = tk.Tk()
    app = FlowerConverterApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
