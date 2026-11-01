"""Professional PDF Export Service using ReportLab.

Produces publication-grade, multi-page agricultural and financial reports with
dynamic column wrapping, summary KPI scorecards, alternating row shading,
and 'Page X of Y' numbering.
"""

import io
from datetime import datetime
from decimal import Decimal
from typing import List, Dict, Any, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
)

from app.schemas.report import UnifiedReportResponse, ReportMetadata


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas for dynamic 'Page X of Y' footer generation."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, total_pages: int):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Footer divider line
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.75)
        self.line(36, 32, self._pagesize[0] - 36, 32)

        # Footer Left: Brand & generation date
        ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        self.drawString(36, 20, f"AgriCore Farm Management System | Generated: {ts}")

        # Footer Right: Page numbers
        page_str = f"Page {self._pageNumber} of {total_pages}"
        self.drawRightString(self._pagesize[0] - 36, 20, page_str)

        self.restoreState()


class PDFExportService:
    """Engine compiling report datasets into formatted PDF binary streams."""

    # Brand color palette
    COLOR_PRIMARY = colors.HexColor("#1b4332")      # Deep forest green
    COLOR_PRIMARY_LIGHT = colors.HexColor("#2d6a4f")# Accent green
    COLOR_BG_CARD = colors.HexColor("#f1f5f9")      # Light slate
    COLOR_BORDER = colors.HexColor("#cbd5e1")       # Slate border
    COLOR_TEXT_MAIN = colors.HexColor("#0f172a")    # Charcoal
    COLOR_TEXT_MUTED = colors.HexColor("#475569")   # Muted slate
    COLOR_ROW_ALT = colors.HexColor("#f8fafc")      # Alternate row zebra

    @classmethod
    def generate_pdf(cls, report: UnifiedReportResponse) -> bytes:
        """Render unified report into a polished PDF document."""
        buffer = io.BytesIO()

        # Landscape A4 for wide table layouts
        pagesize = landscape(A4)
        doc = SimpleDocTemplate(
            buffer,
            pagesize=pagesize,
            leftMargin=36,
            rightMargin=36,
            topMargin=36,
            bottomMargin=45,
        )

        styles = getSampleStyleSheet()

        # Custom typography styles
        style_title = ParagraphStyle(
            "ReportTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=cls.COLOR_PRIMARY,
        )

        style_subtitle = ParagraphStyle(
            "ReportSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=cls.COLOR_PRIMARY_LIGHT,
        )

        style_meta = ParagraphStyle(
            "ReportMeta",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=cls.COLOR_TEXT_MUTED,
        )

        style_th = ParagraphStyle(
            "TableHeader",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=colors.white,
            alignment=1,  # Center
        )

        style_td = ParagraphStyle(
            "TableCell",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=9.5,
            textColor=cls.COLOR_TEXT_MAIN,
        )

        style_td_bold = ParagraphStyle(
            "TableCellBold",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=9.5,
            textColor=cls.COLOR_PRIMARY,
        )

        story = []

        # -------------------------------------------------------------
        # 1. Header & Title Block
        # -------------------------------------------------------------
        meta: ReportMetadata = report.metadata

        header_table_data = [
            [
                Paragraph("<b>AgriCore</b> | Farm Management System", style_subtitle),
                Paragraph(f"<b>Generated:</b> {meta.generated_at.strftime('%Y-%m-%d %H:%M:%S UTC')}", style_meta),
            ],
            [
                Paragraph(f"{meta.report_title}", style_title),
                Paragraph(f"<b>Reporting Estate:</b> {meta.farm_name}", style_meta),
            ],
            [
                Paragraph(f"<b>Period:</b> {meta.period.label}", style_meta),
                Paragraph(f"<b>Total Records:</b> {meta.total_records}", style_meta),
            ],
        ]

        header_table = Table(
            header_table_data,
            colWidths=[doc.width * 0.65, doc.width * 0.35],
        )
        header_table.setStyle(
            TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
            ])
        )
        story.append(header_table)
        story.append(Spacer(1, 10))
        story.append(HRFlowable(width="100%", thickness=1.5, color=cls.COLOR_PRIMARY_LIGHT, spaceAfter=12))

        # -------------------------------------------------------------
        # 2. KPI / Summary Scorecard Block
        # -------------------------------------------------------------
        if report.summary_cards:
            summary_cells = []
            for k, v in list(report.summary_cards.items())[:6]:  # Show top 6 cards
                clean_k = k.replace("_", " ").title()
                if isinstance(v, (float, int, Decimal)):
                    if "revenue" in k or "income" in k or "profit" in k or "expenses" in k or "wage" in k or "paid" in k or "cost" in k or "value" in k:
                        val_str = f"₹{float(v):,.2f}"
                    elif "percentage" in k or "rate" in k:
                        val_str = f"{float(v):.1f}%"
                    elif "area" in k:
                        val_str = f"{float(v):.2f} acres"
                    else:
                        val_str = str(v)
                elif isinstance(v, dict):
                    val_str = ", ".join(f"{dk}: {dv}" for dk, dv in v.items())
                else:
                    val_str = str(v)

                card_content = [
                    Paragraph(f"<b>{clean_k}</b>", style_meta),
                    Spacer(1, 2),
                    Paragraph(f"<b>{val_str}</b>", style_subtitle),
                ]
                summary_cells.append(card_content)

            # Arrange into 3 columns
            card_rows = []
            current_row = []
            for cell in summary_cells:
                current_row.append(cell)
                if len(current_row) == 3:
                    card_rows.append(current_row)
                    current_row = []
            if current_row:
                while len(current_row) < 3:
                    current_row.append("")
                card_rows.append(current_row)

            if card_rows:
                kpi_table = Table(
                    card_rows,
                    colWidths=[doc.width / 3.0] * 3,
                )
                kpi_table.setStyle(
                    TableStyle([
                        ("BACKGROUND", (0, 0), (-1, -1), cls.COLOR_BG_CARD),
                        ("BOX", (0, 0), (-1, -1), 0.5, cls.COLOR_BORDER),
                        ("INNERGRID", (0, 0), (-1, -1), 0.5, cls.COLOR_BORDER),
                        ("TOPPADDING", (0, 0), (-1, -1), 6),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                        ("LEFTPADDING", (0, 0), (-1, -1), 8),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ])
                )
                story.append(kpi_table)
                story.append(Spacer(1, 14))

        # -------------------------------------------------------------
        # 3. Main Data Table
        # -------------------------------------------------------------
        if report.table_rows and report.table_headers:
            headers = report.table_headers
            col_count = len(headers)
            col_w = doc.width / float(col_count)

            # Build table rows
            table_data = []

            # Header row
            header_row = [Paragraph(f"<b>{h}</b>", style_th) for h in headers]
            table_data.append(header_row)

            # Data rows
            for row in report.table_rows:
                data_row = []
                for h in headers:
                    val = row.get(h, "")
                    val_str = str(val) if val is not None else "-"
                    # Check if monetary or key metric
                    if val_str.startswith("₹"):
                        cell_para = Paragraph(f"<b>{val_str}</b>", style_td_bold)
                    else:
                        cell_para = Paragraph(val_str, style_td)
                    data_row.append(cell_para)
                table_data.append(data_row)

            grid_table = Table(
                table_data,
                colWidths=[col_w] * col_count,
                repeatRows=1,
            )

            ts_styles = [
                ("BACKGROUND", (0, 0), (-1, 0), cls.COLOR_PRIMARY),
                ("ALIGN", (0, 0), (-1, 0), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("GRID", (0, 0), (-1, -1), 0.5, cls.COLOR_BORDER),
            ]

            # Alternate row coloring
            for i in range(1, len(table_data)):
                if i % 2 == 0:
                    ts_styles.append(("BACKGROUND", (0, i), (-1, i), cls.COLOR_ROW_ALT))
                else:
                    ts_styles.append(("BACKGROUND", (0, i), (-1, i), colors.white))

            grid_table.setStyle(TableStyle(ts_styles))
            story.append(grid_table)

        else:
            # Empty state message
            empty_table_data = [
                [
                    Paragraph(
                        "<b>No records found for the selected reporting period and filters.</b><br/>"
                        "<font color='#64748b'>Adjust your date boundaries or select 'All Time' to review historical agricultural operations.</font>",
                        style_td,
                    )
                ]
            ]
            empty_table = Table(empty_table_data, colWidths=[doc.width])
            empty_table.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), cls.COLOR_BG_CARD),
                    ("BOX", (0, 0), (-1, -1), 0.5, cls.COLOR_BORDER),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, -1), 18),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 18),
                ])
            )
            story.append(empty_table)

        # Build document with custom canvas
        doc.build(story, canvasmaker=NumberedCanvas)
        buffer.seek(0)
        return buffer.getvalue()

