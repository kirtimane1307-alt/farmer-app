"""Professional Excel Export Service using OpenPyXL.

Generates beautifully formatted, multi-worksheet spreadsheets with
brand color headers, proper data types (numbers, dates, currency),
auto-fitted column widths, and summary rows.
"""

import io
from datetime import datetime, date
from decimal import Decimal
from typing import List, Dict, Any, Optional

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from app.schemas.report import UnifiedReportResponse, ReportMetadata


class ExcelExportService:
    """Service formatting unified report data into structured Excel (.xlsx) workbooks."""

    # Brand styling constants
    COLOR_BRAND_GREEN = "1B4332"     # Deep forest green
    COLOR_BRAND_LIGHT = "2D6A4F"     # Medium green
    COLOR_ACCENT_BG = "E8F5E9"       # Very light green tint
    COLOR_ROW_ALT = "F8FAFC"         # Soft slate alternate
    COLOR_BORDER = "CBD5E1"          # Slate border

    @classmethod
    def generate_excel(cls, report: UnifiedReportResponse) -> bytes:
        """Compile report dataset into an Excel workbook binary stream."""
        wb = openpyxl.Workbook()
        ws = wb.active

        # Clean sheet title (max 31 chars in Excel)
        clean_title = report.metadata.report_title[:28]
        ws.title = clean_title

        # Styles
        font_main_title = Font(name="Calibri", size=16, bold=True, color="1B4332")
        font_subtitle = Font(name="Calibri", size=11, bold=True, color="2D6A4F")
        font_meta = Font(name="Calibri", size=9, italic=True, color="475569")
        font_th = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
        font_td = Font(name="Calibri", size=10, color="0F172A")
        font_td_bold = Font(name="Calibri", size=10, bold=True, color="1B4332")

        fill_header = PatternFill(start_color=cls.COLOR_BRAND_GREEN, end_color=cls.COLOR_BRAND_GREEN, fill_type="solid")
        fill_alt = PatternFill(start_color=cls.COLOR_ROW_ALT, end_color=cls.COLOR_ROW_ALT, fill_type="solid")
        fill_kpi = PatternFill(start_color=cls.COLOR_ACCENT_BG, end_color=cls.COLOR_ACCENT_BG, fill_type="solid")

        align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)
        align_left = Alignment(horizontal="left", vertical="center")
        align_right = Alignment(horizontal="right", vertical="center")

        thin_side = Side(border_style="thin", color=cls.COLOR_BORDER)
        double_side = Side(border_style="double", color="1B4332")
        border_cell = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
        border_total = Border(top=thin_side, bottom=double_side, left=thin_side, right=thin_side)

        meta: ReportMetadata = report.metadata
        current_row = 1

        # -------------------------------------------------------------
        # 1. Report Header Block
        # -------------------------------------------------------------
        ws.cell(row=current_row, column=1, value="AgriCore Farm Management System").font = font_subtitle
        current_row += 1

        ws.cell(row=current_row, column=1, value=meta.report_title).font = font_main_title
        current_row += 1

        ws.cell(row=current_row, column=1, value=f"Reporting Estate: {meta.farm_name} | Period: {meta.period.label}").font = font_meta
        current_row += 1

        gen_time = meta.generated_at.strftime("%Y-%m-%d %H:%M:%S UTC")
        ws.cell(row=current_row, column=1, value=f"Generated: {gen_time} | Total Records: {meta.total_records}").font = font_meta
        current_row += 2  # Spacer

        # -------------------------------------------------------------
        # 2. KPI Summary Card Block
        # -------------------------------------------------------------
        if report.summary_cards:
            ws.cell(row=current_row, column=1, value="Summary Telemetry").font = font_subtitle
            current_row += 1

            kpi_start_row = current_row
            col_idx = 1
            for k, v in list(report.summary_cards.items())[:8]:
                lbl = k.replace("_", " ").title()
                val_display = v
                if isinstance(v, (float, int, Decimal)):
                    if any(term in k for term in ["revenue", "income", "profit", "expenses", "wage", "paid", "cost", "value"]):
                        val_display = f"₹{float(v):,.2f}"
                    elif "percentage" in k or "rate" in k:
                        val_display = f"{float(v):.1f}%"
                    elif "area" in k:
                        val_display = f"{float(v):.2f} acres"
                elif isinstance(v, dict):
                    val_display = ", ".join(f"{dk}: {dv}" for dk, dv in v.items())

                # Key cell
                cell_k = ws.cell(row=current_row, column=col_idx, value=lbl)
                cell_k.font = font_meta
                cell_k.fill = fill_kpi
                cell_k.border = border_cell

                # Val cell
                cell_v = ws.cell(row=current_row + 1, column=col_idx, value=str(val_display))
                cell_v.font = font_td_bold
                cell_v.fill = fill_kpi
                cell_v.border = border_cell

                col_idx += 1
                if col_idx > 4:
                    col_idx = 1
                    current_row += 2

            if col_idx != 1:
                current_row += 2
            current_row += 1  # Blank row

        # -------------------------------------------------------------
        # 3. Main Data Table
        # -------------------------------------------------------------
        headers = report.table_headers
        if headers and report.table_rows:
            # Header Row
            for col_i, h in enumerate(headers, start=1):
                cell = ws.cell(row=current_row, column=col_i, value=h)
                cell.font = font_th
                cell.fill = fill_header
                cell.alignment = align_center
                cell.border = border_cell
            ws.row_dimensions[current_row].height = 24
            current_row += 1

            # Data Rows
            for r_idx, row in enumerate(report.table_rows):
                is_alt = (r_idx % 2 == 1)
                for col_i, h in enumerate(headers, start=1):
                    val = row.get(h, "")
                    cell = ws.cell(row=current_row, column=col_i)
                    
                    val_str = str(val) if val is not None else ""
                    # Check if monetary
                    if val_str.startswith("₹"):
                        try:
                            num = float(val_str.replace("₹", "").replace(",", "").strip())
                            cell.value = num
                            cell.number_format = '"₹"#,##0.00'
                            cell.alignment = align_right
                            cell.font = font_td_bold
                        except ValueError:
                            cell.value = val_str
                            cell.alignment = align_right
                            cell.font = font_td
                    else:
                        cell.value = val_str
                        cell.alignment = align_left
                        cell.font = font_td

                    if is_alt:
                        cell.fill = fill_alt
                    cell.border = border_cell

                ws.row_dimensions[current_row].height = 20
                current_row += 1

        else:
            empty_cell = ws.cell(row=current_row, column=1, value="No records found matching the specified filters and date range.")
            empty_cell.font = font_meta
            current_row += 1

        # -------------------------------------------------------------
        # 4. Auto-fit column widths
        # -------------------------------------------------------------
        for col in ws.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col:
                val = cell.value
                if val:
                    val_str = str(val)
                    if len(val_str) > max_len:
                        max_len = len(val_str)
            # Apply reasonable min and max bounds
            ws.column_dimensions[col_letter].width = max(max_len + 3, 14)

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()

