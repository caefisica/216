#!/usr/bin/env python3
"""Turn the librarians' register workbook into the catalogue seed file.

    python3 -I scripts/convert-register.py "<register>.xlsx"

Writes src/lib/db/seeds/catalogue.json (what `bun run db:seed` loads) and
src/lib/db/seeds/catalogue.review.csv (every row dropped, repaired or worth a
second look, for the librarians). Standard library only.
"""

import collections
import csv
import difflib
import json
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

SEEDS = Path(__file__).resolve().parent.parent / "src" / "lib" / "db" / "seeds"
NS = {
    "m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}

# Each key is a stripped sheet name. Each value contains the category code, name,
# and whether the category has subcategories.
SHEETS = {
    "Física General": ("FG", "Física General", True),
    "Laboratorio de Física": ("LB", "Laboratorio de Física", False),
    "Cálculo y Análisis Matemático": ("CL", "Cálculo y Análisis Matemático", True),
    "Divulgación": ("DV", "Divulgación", False),
    "Matemática Básica 1 - 2024": ("AM", "Matemática Básica", False),
    "Álgebra Lineal": ("AL", "Álgebra Lineal", False),
    "Fisica Computacional": ("CP", "Física Computacional", False),
    "Física Moderna": ("MD", "Física Moderna", False),
    "Geometría Analítica": ("GN", "Geometría Analítica", False),
    "Física Matemática y Ecuaciones": ("CM", "Física Matemática y Ecuaciones Diferenciales", False),
    "Física Clásica": ("FC", "Física Clásica", False),
    "Física Cuántica": ("FQ", "Física Cuántica", False),
    "Electromagnetismo": ("EL", "Electromagnetismo", False),
    "Termodinámica y Física Estadíst": ("TE", "Termodinámica y Física Estadística", False),
    "Física del Estado Sólido": ("ES", "Física del Estado Sólido", False),
    "Relatividad General": ("CG", "Relatividad General", False),
    "Particulas": ("FP", "Partículas", False),
    "Teoria de Campos": ("TC", "Teoría de Campos", False),
    "Teoria de Cuerdas": ("ST", "Teoría de Cuerdas", False),
    "Materia Condensada": ("MC", "Materia Condensada", False),
    "Astronomía y Astrofísica": ("AA", "Astronomía y Astrofísica", False),
    "Geofísica": ("GP", "Geofísica", False),
    "Electricidad y Electrónica": ("EE", "Electricidad y Electrónica", False),
    "Física Nuclear": ("FN", "Física Nuclear", False),
    "Otros": ("OT", "Otros", False),
    "Química": ("QU", "Química", False),
}

SUPERSEDED = {
    "Matemática Básica": "older list, superseded by 'Matemática Básica 1 - 2024'",
    "Matemática Básica 1": "hidden older list, superseded by 'Matemática Básica 1 - 2024'",
}

# The register numbers subcategories but never names them. These names are
# proposals read off the titles under each number; the librarians confirm them.
SUBCATEGORY_NAMES = {
    "FG.0": "Introducción y física recreativa",
    "FG.1": "Mecánica (Física 1)",
    "FG.2": "Ondas, fluidos y calor (Física 2)",
    "FG.3": "Electricidad y magnetismo (Física 3)",
    "FG.4": "Óptica",
    "FG.5": "Textos completos y problemas",
    "CL.1": "Cálculo diferencial",
    "CL.2": "Cálculo integral",
    "CL.3": "Cálculo vectorial",
    "CL.4": "Análisis matemático y tratados",
}

# Each key is folded text from a Clasificación cell. Each value is a category code.
GRID_NAMES = {
    "laboratorio de fisica": "LB",
    "fisica general": "FG",
    "calculo y analisis matematico": "CL",
    "fisica matematica y ecuaciones diferenciales": "CM",
    "fisica clasica": "FC",
    "electromagnetismo": "EL",
    "fisica moderna": "MD",
    "fisica cuantica": "FQ",
    "termodinamica y f. estadistica": "TE",
    "fisica del estado solido": "ES",
    "fisica nuclear": "FN",
    "materia condensada": "MC",
    "astronomia y astrofisica": "AA",
    "electricidad y electronica": "EE",
    "fisica computacional": "CP",
    "geometria analitica": "GN",
    "algebra lineal": "AL",
    "matematica basica": "AM",
    "quimica": "QU",
    "divulgacion": "DV",
    "otros": "OT",
    "geofisica": "GP",
}
EXTRA_CABINETS = {"Mueble marron", "Cajonera negra"}

# Row repairs a rule cannot make. Keys are (stripped sheet name, workbook row).
OVERRIDES = {
    ("Geofísica", 2): ({"codigo": "CAGP01.1"}, "code typed as CACAGP05.101.1; the row is item 1"),
    ("Geofísica", 24): ({"codigo": "CAGP01.1"}, "code typed as CACAGP05.101.1; the row is item 1"),
    ("Física General", 36): (
        {"titulo": "Física 1", "autor": "Hugo Medina Guzman"},
        "title and author were swapped",
    ),
    ("Física General", 53): (
        {"donante": None, "editorial": "Mir", "pais": "Rusia", "comentarios": None},
        "publisher and country were typed in the donor and comment columns",
    ),
    ("Física General", 92): (
        {
            "sub": "0",
            "codigo": None,
            "titulo": "Theoretical physics, Thermodynamics, Electromagnetism, Waves and Particles",
            "autor": "F. Woodbridge",
            "anio": None,
        },
        "columns shifted and the code CATE00.1 is a placeholder from another category",
    ),
    ("Álgebra Lineal", 7): (
        {"cantidad": "1", "editorial": "El Ateneo", "tipo": "copia", "donante": "Ricardo Quispe"},
        "imprint, quantity and type were typed past the last column",
    ),
    ("Álgebra Lineal", 12): ({"tipo": "copia"}, "type was typed past the last column"),
    ("Álgebra Lineal", 13): ({"tipo": "copia"}, "type was typed past the last column"),
    ("Álgebra Lineal", 14): ({"tipo": "copia"}, "type was typed past the last column"),
    ("Electromagnetismo", 30): (
        {"editorial": None, "cantidad": "0"},
        "quantity 0 was typed in the publisher column",
    ),
}

# These rows and blocks use a column order that differs from their header.
LAYOUTS = {
    ("Otros", 39): {2: "codigo", 3: "titulo", 4: "autor", 6: "cantidad", 8: "comentarios"},
    ("Otros", 40): {
        2: "codigo", 3: "titulo", 4: "autor", 6: "cantidad", 7: "editorial", 8: "pais",
        9: "anio", 10: "tipo", 11: "donante", 12: "comentarios",
    },
    ("Otros", 41): {3: "codigo", 4: "autor", 6: "titulo", 10: "cantidad", 12: "donante", 13: "comentarios"},
    ("Otros", 45): {3: "codigo", 4: "autor", 6: "titulo", 10: "cantidad", 12: "donante", 13: "comentarios"},
    ("Física Moderna", "perdidos"): {
        2: "codigo", 3: "titulo", 4: "autor", 6: "cantidad", 8: "comentarios",
    },
    ("Matemática Básica 1 - 2024", "perdidos"): {
        2: "codigo", 3: "titulo", 5: "autor", 6: "cantidad", 11: "donante", 12: "comentarios",
    },
}
for _row in (73, 74, 75):
    LAYOUTS[("Cálculo y Análisis Matemático", _row)] = {
        0: "id", 1: "sub", 2: "codigo", 3: "autor", 4: "anio", 5: "titulo", 6: "edicion",
        7: "pais", 8: "editorial", 9: "cantidad", 10: "tipo", 11: "donante", 12: "comentarios",
    }

# These donor-column values do not name a person.
NOT_DONORS = {"mir", "c f c f", "cfcf", "base 2008", "topicos de analisis", "analisis de fourier"}
# These are shortened donor names that the register writes in full elsewhere.
DONOR_ALIASES = {"robert": "robert guzman"}

COUNTRIES = {
    "usa": "Estados Unidos", "united states": "Estados Unidos", "eeuu": "Estados Unidos",
    "uk": "Reino Unido", "united kingdom": "Reino Unido", "peru": "Perú", "mexico": "México",
    "espana": "España", "germany": "Alemania", "japan": "Japón", "rusia": "Rusia",
}

POOR = (
    "maltrat", "mal estado", "apolill", "despegad", "incompleto", "partido", "rota", "roto",
    "rotas", "hojas salidas", "hojas sueltas", "hojas medio salidas", "deteriorad",
    "falta la tapa", "faltan los dos",
)
FAIR = (
    "desgast", "arrugad", "dobles", "resaltador", "subrayad", "rayado", "reconstruid",
    "dano", "manchas", "masomenos", "escrito en maquina", "tipografia de maquina",
)
GOOD = ("buen estado",)
STATUS_HINTS = ("no habido", "falta el caaa", "faltan", "no exhibido", "ya existia")
LOAN_REMARK = re.compile(r"prest|devuelt|\brent\b")
GENERIC_BINDING = re.compile(r"\b(tomo|tono|tomo|original|originial|copia)\b")
CODE_RE = re.compile(
    r"^CA(?P<cat>[A-Z]{2})(?:\.(?P<sub>\d+)\.(?P<num>\d+)|(?P<num2>\d+))\.(?P<copy>\d+)$"
)
PIECES_RE = re.compile(r"\s*\((\d+)\s*/\s*(\d+)\)")
HEADER_NAMES = {
    "id": "id", "q": "id", "subid": "sub", "subcategoria": "sub", "codigo": "codigo",
    "codig": "codigo", "codigo actual": "actual", "titulo": "titulo", "autor": "autor",
    "ano": "anio", "tomo": "tomo", "edicion": "edicion", "pais": "pais",
    "editorial": "editorial", "cantidad": "cantidad", "tipo": "tipo", "donante": "donante",
    "comentarios": "comentarios",
}
MARKERS = {"metadata": "metadata", "copias": "copias", "perdidos": "perdidos"}


def fold(text):
    text = unicodedata.normalize("NFKD", text)
    return "".join(c for c in text if not unicodedata.combining(c)).lower()


def words(text):
    return re.sub(r"[^a-z0-9]+", " ", fold(text)).strip()


def clean(value):
    if value is None:
        return None
    text = re.sub(r"\s+", " ", value.replace(" ", " ")).strip()
    if re.fullmatch(r"[-–—_.\s]*", text):
        return None
    return text


def number(text):
    try:
        value = float(text)
    except (TypeError, ValueError):
        return None
    return int(value) if value == int(value) else value


def similarity(a, b):
    return difflib.SequenceMatcher(None, words(a), words(b)).ratio()


def read_workbook(path):
    archive = zipfile.ZipFile(path)
    shared = [
        "".join(t.text or "" for t in si.iter("{%s}t" % NS["m"]))
        for si in ET.fromstring(archive.read("xl/sharedStrings.xml")).findall("m:si", NS)
    ]
    relations = {
        r.get("Id"): r.get("Target")
        for r in ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    }
    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    sheets = []
    for sheet in workbook.find("m:sheets", NS):
        target = relations[sheet.get("{%s}id" % NS["r"])].lstrip("/").removeprefix("xl/")
        root = ET.fromstring(archive.read("xl/" + target))
        rows = []
        for row in root.iter("{%s}row" % NS["m"]):
            cells = {}
            for cell in row.findall("m:c", NS):
                value = cell.find("m:v", NS)
                kind = cell.get("t")
                if kind == "inlineStr":
                    text = "".join(t.text or "" for t in cell.iter("{%s}t" % NS["m"]))
                elif value is None:
                    continue
                elif kind == "s":
                    text = shared[int(value.text)]
                else:
                    text = value.text
                letters = re.match(r"[A-Z]+", cell.get("r")).group()
                index = 0
                for letter in letters:
                    index = index * 26 + ord(letter) - 64
                cells[index - 1] = text
            cells = {c: v for c, v in cells.items() if v is not None and v.strip() != ""}
            rows.append((int(row.get("r")), cells))
        sheets.append({"name": sheet.get("name").strip(), "hidden": sheet.get("state") == "hidden", "rows": rows})
    return sheets


def header_map(cells):
    mapping = {}
    for col, value in cells.items():
        field = HEADER_NAMES.get(words(value))
        if field:
            mapping[col] = field
    return mapping if len(mapping) >= 4 else None


def split_blocks(rows):
    """Yield (block name, header map or None, [(row number, cells)])."""
    blocks = []
    current = ["main", None, []]
    expecting_header = True
    for number_, cells in rows:
        if not cells:
            continue
        marker = None
        if len(cells) <= 2:
            for value in cells.values():
                marker = marker or MARKERS.get(words(value))
        if marker:
            blocks.append(tuple(current))
            current = [marker, None, []]
            expecting_header = marker != "metadata"
            continue
        if expecting_header:
            expecting_header = False
            mapping = header_map(cells)
            if mapping:
                current[1] = mapping
                continue
        current[2].append((number_, cells))
    blocks.append(tuple(current))
    return blocks


class Review:
    def __init__(self):
        self.rows = []

    def add(self, kind, sheet, row, code, what, detail=""):
        self.rows.append((kind, sheet, row if row is not None else "", code or "", what, detail))


def donor_key(text):
    key = words(text)
    key = re.sub(r"\bprof\b", "", key)
    key = re.sub(r"\b20\d\d$", "", key)
    key = re.sub(r"\bbase \d+\b", "", key)
    key = re.sub(r"\bb\d\d\b", "", key)
    key = re.sub(r"\s+", " ", key).strip()
    return DONOR_ALIASES.get(key, key)


def cohort_tag(text):
    match = re.search(r"\(?\b(base \d+|b\d\d)\b\)?", fold(text))
    return match.group(1).replace("base ", "Base ").replace("b", "B", 1) if match else None


def keyed_variants(values):
    """Group spellings that fold to the same key; the commonest spelling wins."""
    groups = collections.defaultdict(collections.Counter)
    for value in values:
        groups[words(value)][value] += 1
    canonical = {}
    for key, counter in groups.items():
        best = max(counter, key=lambda v: (counter[v], v != fold(v), v))
        for value in counter:
            canonical[value] = best
    return canonical


def parse_grid(sheet):
    cabinets = []
    cabinet = None
    for _, cells in sheet["rows"]:
        if words(cells.get(0, "")) == "piso" and cells.get(1):
            cabinet = clean(cells[1])
            continue
        if cabinet is None or not cells:
            continue
        shelf = number(cells.get(0))
        for col, text in cells.items():
            if col == 0 or shelf is None:
                continue
            label = fold(clean(text) or "")
            extra = label.startswith("copias de ")
            label = label.removeprefix("copias de ").strip()
            code = GRID_NAMES.get(label)
            if code is None:
                raise SystemExit(f"Clasificación: no category for '{text}'")
            holds = "extra" if extra or cabinet in EXTRA_CABINETS else "primary"
            cabinets.append(
                {"cabinet": cabinet, "shelf": shelf, "bay": col, "category": code, "holds": holds}
            )
    return cabinets


class Converter:
    def __init__(self, sheets):
        self.sheets = sheets
        self.review = Review()
        self.books = {}
        self.leaf_max = collections.defaultdict(int)
        self.counts = collections.Counter()
        self.pending = []
        self.sheet_stats = {}
        self.donor_raw = collections.Counter()

    def run(self):
        grid = next(s for s in self.sheets if s["name"] == "Clasificación")
        self.locations = parse_grid(grid)
        for sheet in self.sheets:
            name = sheet["name"]
            if name == "Clasificación":
                continue
            if name in SUPERSEDED:
                self.review.add("skipped sheet", name, None, "", SUPERSEDED[name])
                continue
            if name not in SHEETS:
                raise SystemExit(f"unknown sheet '{name}'")
            if sheet["hidden"]:
                self.review.add(
                    "check", name, None, "",
                    "hidden sheet loaded; its books are on loan from a donor until December 2023",
                )
            self.read_sheet(sheet)
        self.settle()
        self.finish()

    def read_sheet(self, sheet):
        name = sheet["name"]
        category, _, has_sub = SHEETS[name]
        stats = self.sheet_stats[name] = collections.Counter()
        main_header = None
        metadata = {}
        for block, header, rows in split_blocks(sheet["rows"]):
            if block == "main":
                main_header = header
            if block == "metadata":
                self.read_metadata(name, rows, metadata)
                continue
            header = header or main_header
            for row_number, cells in rows:
                if self.is_metadata_row(cells):
                    self.read_metadata(name, [(row_number, cells)], metadata)
                    continue
                self.read_row(name, category, has_sub, block, header, row_number, cells, stats)
        stats["total"] = metadata.get("total")
        stats["metadata_code"] = metadata.get("codigo")
        stats["missing_claimed"] = metadata.get("missing")
        if metadata.get("codigo") and metadata["codigo"].upper() != category:
            self.review.add("check", name, None, "", f"metadata code {metadata['codigo']} differs from {category}")

    @staticmethod
    def is_metadata_row(cells):
        """Some sheets list total/codig/missing without a 'metadata' marker row."""
        values = [clean(v) for _, v in sorted(cells.items())]
        values = [v for v in values if v]
        return len(values) == 2 and words(values[0]) in ("total", "codig", "missing")

    def read_metadata(self, sheet, rows, found):
        for row_number, cells in rows:
            values = [clean(v) for _, v in sorted(cells.items())]
            values = [v for v in values if v]
            key = words(values[0]) if values else ""
            if key in ("total", "codigo", "codig", "missing") and len(values) > 1:
                found["codigo" if key == "codig" else key] = values[1]
            elif values:
                self.review.add("dropped", sheet, row_number, "", "free text outside the table", " ".join(values))

    def fields(self, sheet, block, header, row_number, cells):
        layout = LAYOUTS.get((sheet, row_number)) or LAYOUTS.get((sheet, block))
        mapping = layout or header or {}
        top = max(mapping) if mapping else -1
        data = {}
        extra = []
        for col in sorted(cells):
            text = clean(cells[col])
            if col in mapping:
                data[mapping[col]] = text
            elif col > top and text:
                extra.append(text)
        if extra:
            data["comentarios"] = "; ".join(filter(None, [data.get("comentarios"), *extra]))
        override = OVERRIDES.get((sheet, row_number))
        if override:
            data.update(override[0])
            self.review.add("repaired", sheet, row_number, data.get("codigo"), override[1])
        return data

    def read_row(self, sheet, category, has_sub, block, header, row_number, cells, stats):
        f = self.fields(sheet, block, header, row_number, cells)
        stats["rows"] += 1
        title = f.get("titulo")
        if title and re.fullmatch(r"[-\s]*", title):
            title = None
        code_text = f.get("codigo")
        raw_code = code_text
        code = None
        if code_text:
            code_text = re.sub(r"\s+", "", code_text).upper()
            if re.fullmatch(r"CA[A-Z]{2}\.?0*0\.\d+", code_text) or re.fullmatch(r"CA[A-Z]{2}\.0\.00\.\d+", code_text):
                self.review.add(
                    "dropped" if not title else "repaired", sheet, row_number, raw_code,
                    "placeholder code", "no title" if not title else "a new code is issued",
                )
                code_text = None
            else:
                code = CODE_RE.match(code_text)
                if code is None:
                    self.review.add("repaired", sheet, row_number, raw_code, "code is not a valid code; a new code is issued")
                    code_text = None
        has_content = any(f.get(k) for k in ("autor", "comentarios", "donante", "editorial"))
        if not title and not (code and (f.get("autor") or f.get("comentarios"))):
            text = "; ".join(str(v) for k, v in f.items() if v and k != "id")
            self.review.add("dropped", sheet, row_number, raw_code, "no title", text)
            stats["dropped"] += 1
            return
        if not title:
            title = "Sin título"
            self.review.add("check", sheet, row_number, raw_code, "row has no title; loaded as 'Sin título'", f.get("autor") or "")
        del has_content
        entry = {
            "sheet": sheet, "row": row_number, "block": block, "category": category,
            "f": f, "title": title, "raw_code": raw_code, "code": None, "sub": None,
        }
        sub_text = f.get("sub")
        sub = int(number(sub_text)) if sub_text and number(sub_text) is not None else None
        if code:
            if code.group("cat") != category:
                fixed = f"CA{category}"
                self.review.add(
                    "repaired", sheet, row_number, raw_code,
                    f"code is of category {code.group('cat')}; filed under {category}",
                    "a new code is issued" if block != "main" else "",
                )
                code = None
                if has_sub:
                    code_text = None
                else:
                    match = CODE_RE.match(fixed + re.sub(r"^CA[A-Z]{2}", "", code_text))
                    code = match
                    entry["note_code"] = raw_code
            if code:
                code_sub = int(code.group("sub")) if code.group("sub") is not None else None
                if has_sub:
                    if sub is not None and code_sub != sub:
                        self.review.add(
                            "repaired", sheet, row_number, raw_code,
                            f"code subcategory {code_sub} differs from the subcategory column {sub}; the column wins",
                        )
                    sub = sub if sub is not None else code_sub
                entry["num"] = int(code.group("num") or code.group("num2"))
                entry["copy"] = int(code.group("copy"))
        if has_sub and sub is None:
            sub = 0
            self.review.add("check", sheet, row_number, raw_code, "no subcategory; filed under subcategory 0")
        entry["sub"] = sub if has_sub else None
        entry["leaf"] = f"{category}.{sub}" if has_sub else category
        entry["coded"] = bool(code and "num" in entry)
        if entry["coded"]:
            self.leaf_max[entry["leaf"]] = max(self.leaf_max[entry["leaf"]], entry["num"])
            self.place(entry)
        else:
            self.pending.append(("new_book", entry))

    @staticmethod
    def book_code(entry, num=None):
        num = num if num is not None else entry["num"]
        if entry["sub"] is not None:
            return f"CA{entry['category']}.{entry['sub']}.{num:02d}"
        return f"CA{entry['category']}{num:02d}"

    def place(self, entry):
        code = self.book_code(entry)
        book = self.books.get(code)
        if book is None:
            self.add_book(code, entry, entry["copy"])
            return
        number_ = entry["copy"]
        if similarity(book["title"], entry["title"]) < 0.8:
            target = self.find_by_title(entry)
            if target:
                entry["target"] = target["code"]
                self.pending.append(("new_copy", entry))
                self.review.add(
                    "repaired", entry["sheet"], entry["row"], entry["raw_code"],
                    f"code belongs to '{book['title']}'; the title matches {target['code']}, filed there as a new copy",
                    entry["title"],
                )
                return
        if number_ in book["copies"]:
            same = self.same_item(book, entry)
            if same:
                self.merge_duplicate(book, number_, entry)
                return
            if similarity(book["title"], entry["title"]) >= 0.6:
                self.pending.append(("new_copy", entry))
                self.review.add(
                    "repaired", entry["sheet"], entry["row"], entry["raw_code"],
                    f"copy number {number_} already used by another copy of this title; a new copy number is issued",
                )
            else:
                self.review.add(
                    "repaired", entry["sheet"], entry["row"], entry["raw_code"],
                    f"code already belongs to '{book['title']}'; a new code is issued",
                )
                entry["note_code"] = entry["raw_code"]
                self.pending.append(("new_book", entry))
            return
        if similarity(book["title"], entry["title"]) < 0.8:
            entry["note_title"] = entry["title"]
            self.review.add(
                "check", entry["sheet"], entry["row"], entry["raw_code"],
                f"title differs from '{book['title']}'; attached by code, register title kept in notes",
                entry["title"],
            )
        self.add_copy(book, entry, number_)

    def find_by_title(self, entry):
        best, best_score = None, 0.85
        for book in self.books.values():
            if book["category"] != entry["leaf"]:
                continue
            score = similarity(book["title"], entry["title"])
            if score >= best_score and self.same_author(book["author"], entry["f"].get("autor")):
                best, best_score = book, score
        return best

    @staticmethod
    def same_author(a, b):
        return not (a and b) or similarity(a, b) >= 0.5

    def same_item(self, book, entry):
        existing = book["copies"][entry["copy"]]["entry"]
        if similarity(existing["title"], entry["title"]) < 0.85:
            return False
        a, b = existing["f"], entry["f"]
        if not self.same_author(a.get("autor"), b.get("autor")):
            return False
        for key in ("donante", "anio"):
            if a.get(key) and b.get(key) and words(a[key]) != words(b[key]):
                return False
        return True

    def merge_duplicate(self, book, number_, entry):
        existing = book["copies"][number_]
        text = fold(entry["f"].get("comentarios") or "")
        detail = f"row {existing['entry']['row']} of {existing['entry']['sheet']}"
        if re.search(r"perdid|desaparecid", text) or entry["block"] == "perdidos":
            existing["lost"] = True
            detail += "; the repeat says lost, so the copy is marked missing"
        self.review.add(
            "dropped", entry["sheet"], entry["row"], entry["raw_code"],
            "same code and same item as an earlier row", detail,
        )

    def add_book(self, code, entry, number_):
        book = {
            "code": code, "category": entry["leaf"], "title": entry["title"],
            "author": entry["f"].get("autor"), "num": entry.get("num"), "copies": {},
        }
        self.books[code] = book
        self.add_copy(book, entry, number_)

    def add_copy(self, book, entry, number_):
        entry["number"] = number_
        book["copies"][number_] = {"entry": entry, "lost": False}

    def settle(self):
        for kind, entry in self.pending:
            if kind == "new_copy":
                book = self.books[entry.get("target") or self.book_code(entry)]
                self.add_copy(book, entry, max(book["copies"]) + 1)
                continue
            self.leaf_max[entry["leaf"]] += 1
            num = self.leaf_max[entry["leaf"]]
            code = self.book_code(entry, num)
            entry["num"] = num
            self.review.add(
                "repaired", entry["sheet"], entry["row"], entry["raw_code"], f"new code issued: {code}.1",
                entry["title"],
            )
            entry["issued"] = True
            self.add_book(code, entry, 1)

    def finish(self):
        self.build_donors()
        self.build_categories()
        self.build_copies()
        self.report_checks()

    def build_donors(self):
        raw = collections.Counter()
        for book in self.books.values():
            for copy in book["copies"].values():
                donor = copy["entry"]["f"].get("donante")
                if donor:
                    raw[donor] += 1
        plain = {donor_key(v) for v in raw if not cohort_tag(v)}
        spellings = collections.defaultdict(collections.Counter)
        self.donor_of = {}
        for value, count in raw.items():
            key = donor_key(value)
            if key in NOT_DONORS or words(value) in NOT_DONORS:
                self.donor_of[value] = None
                continue
            tag = cohort_tag(value)
            label = key
            if tag and key not in plain:
                label = f"{key} ({tag})"
            base = re.sub(r"\s*\((?:base \d+|b\d\d)\)", "", value, flags=re.I)
            base = re.sub(r"\s+(?:base \d+|b\d\d)$", "", base, flags=re.I)
            base = re.sub(r"\s*-\s*20\d\d$", "", re.sub(r"^prof\.?\s*", "", base, flags=re.I)).strip()
            if tag and key not in plain:
                base = f"{base} ({tag})"
            spellings[label][base] += count
            self.donor_of[value] = label
        names = {}
        for label, counter in spellings.items():
            names[label] = max(counter, key=lambda v: (counter[v], v != fold(v), v))
        for value, label in self.donor_of.items():
            if label is not None:
                self.donor_of[value] = names[label]
        merged = collections.defaultdict(list)
        for value, name in self.donor_of.items():
            if name is not None and value != name:
                merged[name].append(value)
        for name, values in sorted(merged.items()):
            self.review.add("merged", "", None, "", f"donor '{name}'", " | ".join(sorted(values)))
        self.donors = sorted({n for n in self.donor_of.values() if n})

    def build_categories(self):
        self.categories = []
        order = []
        for sheet_name, (code, name, has_sub) in SHEETS.items():
            order.append(code)
            self.categories.append({"code": code, "name": name})
            if has_sub:
                subs = sorted({b["category"] for b in self.books.values() if b["category"].startswith(code + ".")})
                for sub in subs:
                    self.categories.append(
                        {"code": sub, "name": SUBCATEGORY_NAMES[sub], "parent": code}
                    )
        self.category_order = {c["code"]: i for i, c in enumerate(self.categories)}
        for sub, name in SUBCATEGORY_NAMES.items():
            titles = [b["title"] for b in self.books.values() if b["category"] == sub][:4]
            self.review.add("proposal", "", None, sub, f"subcategory name: {name}", " | ".join(titles))

    def default_location(self, category_code, number_):
        top = category_code.split(".")[0]
        kind = "primary" if number_ == 1 else "extra"
        for wanted in (kind, "primary"):
            bays = [l for l in self.locations if l["category"] == top and l["holds"] == wanted]
            if len(bays) == 1:
                return bays[0]
            if len(bays) > 1:
                return None
        return None

    def build_copies(self):
        publishers = keyed_variants(
            [c["entry"]["f"]["editorial"] for b in self.books.values() for c in b["copies"].values()
             if c["entry"]["f"].get("editorial") and number(c["entry"]["f"]["editorial"]) is None]
        )
        for value, best in publishers.items():
            if value != best:
                self.review.add("merged", "", None, "", f"publisher '{best}'", value)
        no_location = collections.Counter()
        self.output_books = []
        for code in sorted(self.books, key=self.book_sort):
            book = self.books[code]
            copies = []
            for number_ in sorted(book["copies"]):
                copies.append(self.build_copy(book, number_, publishers, no_location))
            title, author = book["title"], book["author"]
            title = PIECES_RE.sub("", title).strip() or title
            record = {"code": code, "category": book["category"], "title": title}
            if author:
                record["author"] = author
            record["copies"] = copies
            self.output_books.append(record)
        for category, count in sorted(no_location.items()):
            self.review.add("check", "", None, category, f"{count} copies have no default location", "")

    def book_sort(self, code):
        book = self.books[code]
        return (self.category_order[book["category"]], book["num"] if book["num"] is not None else 0, code)

    def build_copy(self, book, number_, publishers, no_location):
        item = book["copies"][number_]
        entry = item["entry"]
        f = entry["f"]
        sheet, row = entry["sheet"], entry["row"]
        notes = []
        comment = f.get("comentarios")
        if comment:
            notes.append(comment)

        origin = None
        for key in ("tipo", "tomo"):
            text = f.get(key)
            if not text or number(text) is not None:
                continue
            folded = fold(text)
            if origin is None:
                if re.search(r"original|originial", folded):
                    origin = "original"
                elif re.search(r"copia|anillad|empast", folded):
                    origin = "copy"
            rest = GENERIC_BINDING.sub("", folded).strip()
            if rest and text not in notes:
                notes.append(text)
        country = f.get("pais")
        if country and re.search(r"copia|anillad|empast", fold(country)):
            origin = origin or "copy"
            notes.append(country)
            country = None
            self.review.add("repaired", sheet, row, entry["raw_code"], "binding words were in the country column; moved to notes")
        if origin is None:
            origin = "original"
            self.sheet_stats[sheet]["no_type"] += 1

        volume = None
        volume_text = f.get("tomo")
        if volume_text and number(volume_text) is not None:
            volume = str(number(volume_text))
        match = PIECES_RE.search(entry["title"])
        if match:
            volume = f"{match.group(1)} de {match.group(2)}"

        year = None
        year_text = f.get("anio")
        tipo = f.get("tipo")
        if tipo and number(tipo) is not None and 1000 < number(tipo) < 2100 and not year_text:
            year_text = tipo
            self.review.add("repaired", sheet, row, entry["raw_code"], "year was in the type column")
        edition = f.get("edicion")
        if year_text:
            digits = re.match(r"\s*(\d{4})", year_text)
            if digits and 1400 < int(digits.group(1)) < 2100:
                year = int(digits.group(1))
                ed = re.search(r"\((\d+)(?:st|nd|rd|th) ed", year_text)
                if ed and not edition:
                    edition = ed.group(1)
            elif number(year_text) is None and words(year_text) != words(f.get("autor") or ""):
                notes.append(f"Año en el registro: {year_text}")
        if edition:
            ed_number = number(edition)
            if ed_number is not None:
                edition = str(ed_number)
            else:
                notes.append(f"Edición en el registro: {edition}")
                edition = None
        publisher = f.get("editorial")
        if publisher and number(publisher) is not None:
            edition = edition or str(number(publisher))
            publisher = None
            self.review.add("repaired", sheet, row, entry["raw_code"], "edition was in the publisher column")
        elif publisher:
            if self.donor_of.get(publisher) or donor_key(publisher) in {donor_key(d) for d in self.donors}:
                self.review.add("repaired", sheet, row, entry["raw_code"], "publisher is a donor name; dropped", publisher)
                publisher = None
            else:
                publisher = publishers.get(publisher, publisher)
        if country:
            country = COUNTRIES.get(words(country), country)

        pieces_value = number(f.get("cantidad"))
        status = "present"
        lost_block = entry["block"] == "perdidos"
        if item["lost"] or lost_block or pieces_value == 0:
            status = "missing"
        elif re.search(r"perdid|desaparecid", fold(comment or "")):
            status = "missing"
        pieces = int(pieces_value) if pieces_value and pieces_value >= 1 else 1
        if pieces_value is None:
            self.sheet_stats[sheet]["blank_quantity"] += 1
        if lost_block and pieces_value and pieces_value >= 1:
            self.review.add("check", sheet, row, entry["raw_code"], f"listed as lost but quantity is {pieces}", entry["title"])
        if pieces_value == 0 and (f.get("donante") or comment):
            self.review.add("check", sheet, row, entry["raw_code"], "quantity 0 (loaded as missing) but the row has a donor or comment", entry["title"])

        donor_raw = f.get("donante")
        donor = None
        if donor_raw:
            donor = self.donor_of.get(donor_raw)
            if donor is None:
                notes.append(f"Celda de donante: {donor_raw}")
                self.review.add("check", sheet, row, entry["raw_code"], "donor cell names no person; kept in notes", donor_raw)

        condition = None
        folded_comment = fold(comment or "")
        for level, keys in (("poor", POOR), ("fair", FAIR), ("good", GOOD)):
            hit = next((k for k in keys if k in folded_comment), None)
            if hit:
                condition = level
                self.review.add("condition", sheet, row, entry["raw_code"], f"{level}: '{hit}'", comment)
                break
        if comment and LOAN_REMARK.search(folded_comment):
            self.review.add("check", sheet, row, entry["raw_code"], "loan remark kept in notes; no borrower is recorded", comment)
        if comment:
            hint = next((h for h in STATUS_HINTS if h in folded_comment), None)
            if hint:
                self.review.add("check", sheet, row, entry["raw_code"], f"comment may describe the copy's status ('{hint}')", comment)

        if entry.get("note_title"):
            notes.append(f"Título en el registro: {entry['note_title']}")
        if entry.get("note_code"):
            notes.append(f"Código en el registro: {entry['note_code']}")
        labelled = not entry.get("issued") and not re.search(r"sin codigo", folded_comment)

        copy = {"number": number_, "origin": origin}
        if volume:
            copy["volume"] = volume
        copy["pieces"] = pieces
        for key, value in (("edition", edition), ("year", year), ("country", country), ("publisher", publisher)):
            if value:
                copy[key] = value
        location = self.default_location(book["category"], number_)
        if location:
            copy["location"] = f"{location['cabinet']}/{location['shelf']}/{location['bay']}"
        else:
            no_location[book["category"].split(".")[0]] += 1
        if donor:
            copy["donor"] = donor
        copy["status"] = status
        if condition:
            copy["condition"] = condition
        copy["labelled"] = labelled
        if notes:
            copy["notes"] = "; ".join(dict.fromkeys(notes))
        return copy

    def report_checks(self):
        by_category = collections.defaultdict(list)
        for book in self.books.values():
            by_category[book["category"].split(".")[0]].append(book)
        for category, books in by_category.items():
            seen = collections.defaultdict(list)
            for book in books:
                seen[words(PIECES_RE.sub("", book["title"]))].append(book)
            for group in seen.values():
                if len(group) < 2:
                    continue
                tokens = [
                    {w for w in words(b["author"] or "").split() if len(w) > 3} for b in group
                ]
                if all(tokens[0] & t for t in tokens[1:]):
                    codes = ", ".join(b["code"] for b in group)
                    self.review.add("check", "", None, codes, "same title and a shared author on several books", group[0]["title"])
        for sheet, stats in self.sheet_stats.items():
            if stats["no_type"]:
                self.review.add("guess", sheet, None, "", f"{stats['no_type']} copies have no type; loaded as original")
            if stats["blank_quantity"]:
                self.review.add("guess", sheet, None, "", f"{stats['blank_quantity']} copies have no quantity; loaded as 1 present")
        used = {(l["cabinet"], l["shelf"], l["bay"]) for l in self.locations}
        placed = {l["category"] for l in self.locations}
        for code, name, _ in SHEETS.values():
            if code not in placed:
                self.review.add("check", "", None, code, f"{name} is not on the Clasificación grid; its copies have no location")
        del used


def write_outputs(conv, source):
    counts = collections.Counter()
    for book in conv.output_books:
        for copy in book["copies"]:
            counts["copies"] += 1
            counts[copy["status"]] += 1
            counts[copy["origin"]] += 1
            if copy.get("condition"):
                counts["condition"] += 1
            if "location" not in copy:
                counts["no location"] += 1
    leaf_next = {}
    for category in conv.categories:
        code = category["code"]
        has_children = any(c.get("parent") == code for c in conv.categories)
        if not has_children:
            leaf_next[code] = conv.leaf_max.get(code, 0) + 1
    categories = [
        {**c, **({"next": leaf_next[c["code"]]} if c["code"] in leaf_next else {})}
        for c in conv.categories
    ]
    out = SEEDS / "catalogue.json"
    with out.open("w", encoding="utf-8") as handle:
        handle.write('{\n"categories": [\n')
        handle.write(",\n".join(json.dumps(c, ensure_ascii=False) for c in categories))
        handle.write('\n],\n"locations": [\n')
        handle.write(",\n".join(json.dumps(l, ensure_ascii=False) for l in conv.locations))
        handle.write('\n],\n"donors": [\n')
        handle.write(",\n".join(json.dumps(d, ensure_ascii=False) for d in conv.donors))
        handle.write('\n],\n"books": [\n')
        handle.write(",\n".join(json.dumps(b, ensure_ascii=False) for b in conv.output_books))
        handle.write("\n]\n}\n")
    stats_rows = []
    for sheet, stats in conv.sheet_stats.items():
        code = SHEETS[sheet][0]
        loaded = sum(
            len(b["copies"]) for b in conv.output_books if b["category"].split(".")[0] == code
        )
        pieces = sum(
            c["pieces"] for b in conv.output_books if b["category"].split(".")[0] == code
            for c in b["copies"]
        )
        stats_rows.append(
            (sheet, stats["rows"], stats["dropped"], loaded, pieces, stats["total"] or "", stats["missing_claimed"] or "")
        )
    review = list(dict.fromkeys(conv.review.rows))
    order = {"skipped sheet": 0, "dropped": 1, "repaired": 2, "check": 3, "guess": 4, "merged": 5, "condition": 6, "proposal": 7}
    review.sort(key=lambda r: (order[r[0]], r[1], r[2] if isinstance(r[2], int) else 0, r[3]))
    with (SEEDS / "catalogue.review.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        writer.writerow(["kind", "sheet", "row", "code", "what", "detail"])
        writer.writerows(review)
    kinds = collections.Counter(r[0] for r in review)
    print(f"source: {source.name}")
    print(f"categories {len(conv.categories)}, locations {len(conv.locations)}, donors {len(conv.donors)}, books {len(conv.output_books)}")
    print("copies", dict(counts))
    print("review rows", dict(kinds))
    print("sheet | rows read | dropped | copies loaded | pieces loaded | metadata total | metadata missing")
    for row in stats_rows:
        print(" | ".join(str(c) for c in row))


def main():
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    source = Path(sys.argv[1])
    conv = Converter(read_workbook(source))
    conv.run()
    write_outputs(conv, source)


main()
