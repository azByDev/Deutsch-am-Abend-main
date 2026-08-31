from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER

ORANGE = HexColor("#ff751f")
FOREST = HexColor("#2D5016")
CHARCOAL = HexColor("#2B2B2B")
SLATE = HexColor("#666666")
LINE = HexColor("#E8E0D6")
CREAM = HexColor("#F5F1E8")

doc = SimpleDocTemplate(
    "membership-application-form.pdf",
    pagesize=letter,
    topMargin=0.65 * inch,
    bottomMargin=0.65 * inch,
    leftMargin=0.7 * inch,
    rightMargin=0.7 * inch,
)

styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    "Title2", parent=styles["Title"],
    fontName="Helvetica-Bold", fontSize=20, textColor=FOREST,
    spaceAfter=2, alignment=TA_LEFT,
)
subtitle_style = ParagraphStyle(
    "Subtitle", parent=styles["Normal"],
    fontName="Helvetica", fontSize=10.5, textColor=ORANGE,
    spaceAfter=14, alignment=TA_LEFT,
)
section_style = ParagraphStyle(
    "Section", parent=styles["Heading2"],
    fontName="Helvetica-Bold", fontSize=12.5, textColor=FOREST,
    spaceBefore=16, spaceAfter=8,
)
body_style = ParagraphStyle(
    "Body2", parent=styles["Normal"],
    fontName="Helvetica", fontSize=9.5, textColor=CHARCOAL,
    leading=14, spaceAfter=6,
)
small_style = ParagraphStyle(
    "Small", parent=styles["Normal"],
    fontName="Helvetica", fontSize=8.5, textColor=SLATE,
    leading=12,
)
field_label_style = ParagraphStyle(
    "FieldLabel", parent=styles["Normal"],
    fontName="Helvetica-Bold", fontSize=9, textColor=CHARCOAL,
)

story = []

# Header
story.append(Paragraph("Deutsch am Abend", title_style))
story.append(Paragraph("GERMAN LANGUAGE COMMUNITY · NON-PROFIT ORGANIZATION", subtitle_style))
story.append(HRFlowable(width="100%", thickness=1.4, color=ORANGE, spaceAfter=14))

story.append(Paragraph("Membership Application Form", section_style))
story.append(Paragraph(
    "Deutsch am Abend members receive an exclusive discount "
    "on all course fees — A1 through B2, and Goethe-Zertifikat exam preparation courses. "
    "Please complete this form, sign it, and email it back to us together with your "
    "proof of payment for your chosen course.",
    body_style
))

# ---- helper to build a labeled blank-line field row ----
def field_row(label, width_ratio=1.0):
    t = Table(
        [[Paragraph(label, field_label_style), ""]],
        colWidths=[1.7 * inch, 4.3 * inch * width_ratio],
    )
    t.setStyle(TableStyle([
        ("LINEBELOW", (1, 0), (1, 0), 0.8, LINE),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
    ]))
    return t

# Section 1: Personal Information
story.append(Paragraph("1. Personal Information", section_style))
story.append(field_row("Full Name:"))
story.append(field_row("Date of Birth:"))
story.append(field_row("Email Address:"))
story.append(field_row("Phone / Mobile Number:"))
story.append(field_row("City / Location:"))

# Section 2: Course Information
story.append(Paragraph("2. Course You Are Enrolling In", section_style))
story.append(Paragraph(
    "Mark the course you are registering for as a Member:",
    body_style
))

checkbox_data = [
    ["A1 — Beginner", "A2 — Elementary"],
    ["B1 — Intermediate", "B2 — Upper Intermediate"],
    ["Goethe-Zertifikat Exam Prep", ""],
]
t_check = Table(checkbox_data, colWidths=[3 * inch, 3 * inch])
t_check.setStyle(TableStyle([
    ("FONTSIZE", (0, 0), (-1, -1), 10),
    ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ("LEFTPADDING", (0, 0), (-1, -1), 22),
    ("TEXTCOLOR", (0, 0), (-1, -1), CHARCOAL),
    ("BOX", (0, 0), (0, 0), 0.8, CHARCOAL),
    ("BOX", (1, 0), (1, 0), 0.8, CHARCOAL),
    ("BOX", (0, 1), (0, 1), 0.8, CHARCOAL),
    ("BOX", (1, 1), (1, 1), 0.8, CHARCOAL),
    ("BOX", (0, 2), (0, 2), 0.8, CHARCOAL),
]))

# Draw small checkbox squares manually using a canvas-level approach via Spacer + Drawing
from reportlab.graphics.shapes import Drawing, Rect
from reportlab.platypus.flowables import Flowable

class CheckboxRow(Flowable):
    def __init__(self, label, width=280, box_size=10):
        Flowable.__init__(self)
        self.label = label
        self.width = width
        self.box_size = box_size
        self.height = 18

    def draw(self):
        c = self.canv
        c.setStrokeColor(CHARCOAL)
        c.setLineWidth(0.8)
        c.rect(0, 2, self.box_size, self.box_size, stroke=1, fill=0)
        c.setFont("Helvetica", 10)
        c.setFillColor(CHARCOAL)
        c.drawString(self.box_size + 8, 3, self.label)

checkbox_items = [
    "A1 — Beginner", "A2 — Elementary",
    "B1 — Intermediate", "B2 — Upper Intermediate",
    "Goethe-Zertifikat Exam Prep",
]
rows = []
for i in range(0, len(checkbox_items), 2):
    left = CheckboxRow(checkbox_items[i])
    if i + 1 < len(checkbox_items):
        right = CheckboxRow(checkbox_items[i + 1])
    else:
        right = ""
    rows.append([left, right])

t_check = Table(rows, colWidths=[3 * inch, 3 * inch])
t_check.setStyle(TableStyle([
    ("TOPPADDING", (0, 0), (-1, -1), 4),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
]))
story.append(t_check)
story.append(Spacer(1, 6))
story.append(field_row("Preferred Schedule:"))

# Section 3: Payment & Proof
story.append(Paragraph("3. Payment Confirmation", section_style))
story.append(Paragraph(
    "Please make your course payment using the bank or GCash details provided by "
    "Deutsch am Abend, then attach proof of payment (screenshot or receipt) when "
    "you email this signed form back to us.",
    body_style
))
story.append(field_row("Amount Paid:"))
story.append(field_row("Payment Method (GCash / Bank Transfer):"))
story.append(field_row("Date of Payment:"))
story.append(field_row("Reference / Transaction No.:"))

# Section 4: Declaration & Signature
story.append(Paragraph("4. Declaration & Signature", section_style))
story.append(Paragraph(
    "I confirm that the information provided above is accurate. I understand that "
    "Deutsch am Abend Membership is free to apply for, and that my course "
    "discount will be applied once this form and my proof of payment are verified "
    "by the Deutsch am Abend team.",
    body_style
))
story.append(Spacer(1, 10))
story.append(field_row("Signature:"))
story.append(field_row("Date:"))

# Footer instructions box
story.append(Spacer(1, 18))
instructions_data = [[
    Paragraph(
        "<b>How to submit:</b> Email this completed and signed form, along with your "
        "proof of payment, to <b>info.deutschamabend@gmail.com</b>. "
        "We will confirm your membership and apply your 10% discount within "
        "2–3 business days.",
        ParagraphStyle("InstrText", parent=body_style, textColor=HexColor("#FFFFFF"), fontSize=9.5, leading=14)
    )
]]
t_instructions = Table(instructions_data, colWidths=[6.1 * inch])
t_instructions.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), FOREST),
    ("LEFTPADDING", (0, 0), (-1, -1), 16),
    ("RIGHTPADDING", (0, 0), (-1, -1), 16),
    ("TOPPADDING", (0, 0), (-1, -1), 14),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
]))
story.append(t_instructions)

story.append(Spacer(1, 14))
story.append(HRFlowable(width="100%", thickness=0.6, color=LINE, spaceAfter=8))
story.append(Paragraph(
    "Deutsch am Abend is a registered non-profit organization. "
    "info.deutschamabend@gmail.com",
    small_style
))

doc.build(story)
print("PDF created successfully.")
