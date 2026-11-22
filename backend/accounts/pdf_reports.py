
from io import BytesIO

from django.http import HttpResponse
from django.db.models import Sum, Count
from django.utils.dateparse import parse_date

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

from orders.models import Order, OrderItem
from .permission import IsAdminRole


class AdminSalesReportPDFView(APIView):

    permission_classes = [IsAdminRole]

    def get(self, request):

        # -----------------------------
        # DATE VALIDATION
        # -----------------------------

        start_date = parse_date(
            request.query_params.get("start_date", "")
        )

        end_date = parse_date(
            request.query_params.get("end_date", "")
        )

        if not start_date or not end_date:
            return Response(
                {
                    "message": "Valid start_date and end_date are required. Use YYYY-MM-DD."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if start_date > end_date:
            return Response(
                {
                    "message": "Start date cannot be after end date."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # -----------------------------
        # PAID ORDERS
        # -----------------------------

        paid_orders = Order.objects.filter(
            payment_status=Order.PaymentStatus.PAID,
            created_at__date__range=(start_date, end_date)
        ).exclude(
            status__in=[
                Order.Status.CANCELLED,
                Order.Status.RETURNED,
            ]
        )

        # -----------------------------
        # SALES SUMMARY
        # -----------------------------

        summary = paid_orders.aggregate(
            total_revenue=Sum("final_amount"),
            total_orders=Count("id")
        )

        total_revenue = summary["total_revenue"] or 0
        total_orders = summary["total_orders"]

        average_order_value = (
            total_revenue / total_orders
            if total_orders else 0
        )

        # -----------------------------
        # TOP SELLING PRODUCTS
        # -----------------------------

        top_products = OrderItem.objects.filter(
            order__in=paid_orders
        ).values(
            "product_name"
        ).annotate(
            total_quantity=Sum("quantity")
        ).order_by(
            "-total_quantity"
        )[:5]

        # -----------------------------
        # CREATE PDF
        # -----------------------------

        buffer = BytesIO()

        document = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=20 * mm,
            leftMargin=20 * mm,
            topMargin=20 * mm,
            bottomMargin=20 * mm,
        )

        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            "HomeNestTitle",
            parent=styles["Title"],
            textColor=colors.HexColor("#174D3A"),
            fontSize=22,
            spaceAfter=12,
        )

        normal_style = styles["Normal"]

        story = []

        story.append(
            Paragraph("HomeNest - Sales Report", title_style)
        )

        story.append(
            Paragraph(
                f"Report Period: {start_date} to {end_date}",
                normal_style
            )
        )

        story.append(Spacer(1, 15))

        # -----------------------------
        # REVENUE SUMMARY TABLE
        # -----------------------------

        summary_data = [
            ["Sales Summary", "Value"],
            ["Total Revenue", f"Rs. {total_revenue:,.2f}"],
            ["Total Paid Orders", str(total_orders)],
            [
                "Average Order Value",
                f"Rs. {average_order_value:,.2f}"
            ],
        ]

        summary_table = Table(
            summary_data,
            colWidths=[85 * mm, 75 * mm]
        )

        summary_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0),
                 colors.HexColor("#174D3A")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("PADDING", (0, 0), (-1, -1), 9),
                ("BACKGROUND", (0, 1), (-1, -1),
                 colors.HexColor("#FAF7F0")),
            ])
        )

        story.append(summary_table)

        story.append(Spacer(1, 25))

        # -----------------------------
        # TOP SELLING PRODUCTS TABLE
        # -----------------------------

        story.append(
            Paragraph("Top Selling Products", styles["Heading2"])
        )

        product_data = [
            ["Product Name", "Quantity Sold"]
        ]

        for product in top_products:
            product_data.append([
                product["product_name"],
                str(product["total_quantity"]),
            ])

        if len(product_data) == 1:
            product_data.append(["No sales found", "0"])

        product_table = Table(
            product_data,
            colWidths=[110 * mm, 50 * mm]
        )

        product_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0),
                 colors.HexColor("#174D3A")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("PADDING", (0, 0), (-1, -1), 9),
                ("BACKGROUND", (0, 1), (-1, -1),
                 colors.HexColor("#FAF7F0")),
            ])
        )

        story.append(product_table)

        # -----------------------------
        # BUILD PDF
        # -----------------------------

        document.build(story)

        pdf = buffer.getvalue()
        buffer.close()

        response = HttpResponse(
            pdf,
            content_type="application/pdf"
        )

        response["Content-Disposition"] = (
            f'attachment; filename="HomeNest_Sales_Report_'
            f'{start_date}_{end_date}.pdf"'
        )

        return response
