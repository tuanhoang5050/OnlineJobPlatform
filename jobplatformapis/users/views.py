import json, uuid, hmac, hashlib

import requests
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, JSONParser
from django.conf import settings
import paypalrestsdk

from .models import User, Notification, Transaction
from .serializers import UserSerializer, NotificationSerializer
from jobs.models import JobPost
from .serializers import TransactionSerializer



class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.filter(is_active=True)
    serializer_class = UserSerializer
    parser_classes = [MultiPartParser, JSONParser]

    @action(methods=['get', 'patch'], detail=False, url_path='current-user',
            permission_classes=[permissions.IsAuthenticated])
    def current_user(self, request):
        user = request.user

        if request.method == 'PATCH':
            serializer = UserSerializer(user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_date')


class TransactionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user).order_by('-created_date')


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_paypal_payment(request):
    vip_price = "10.00"

    payment = paypalrestsdk.Payment({
        "intent": "sale",
        "payer": {
            "payment_method": "paypal"
        },
        "redirect_urls": {
            "return_url": settings.PAYPAL_RETURN_URL,
            "cancel_url": settings.PAYPAL_CANCEL_URL
        },
        "transactions": [{
            "item_list": {
                "items": [{
                    "name": "Nâng cấp Tài khoản VIP ViCareer",
                    "sku": "vip_package_01",
                    "price": vip_price,
                    "currency": "USD",
                    "quantity": 1
                }]
            },
            "amount": {
                "total": vip_price,
                "currency": "USD"
            },
            "description": "Thanh toán gói VIP cho Nhà tuyển dụng."
        }]
    })

    if payment.create():
        approval_url = next((link.href for link in payment.links if link.rel == "approval_url"), None)

        Transaction.objects.create(
            user=request.user,
            payment_id=payment.id,
            amount=vip_price,
            status='CREATED'
        )

        return Response({"approval_url": approval_url}, status=status.HTTP_200_OK)
    else:
        return Response({"error": payment.error}, status=status.HTTP_400_BAD_REQUEST)



@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def execute_paypal_payment(request):
    payment_id = request.data.get('paymentId')
    payer_id = request.data.get('PayerID')

    if not payment_id or not payer_id:
        return Response({"error": "Thiếu tham số."}, status=status.HTTP_400_BAD_REQUEST)

    payment = paypalrestsdk.Payment.find(payment_id)

    if payment.execute({"payer_id": payer_id}):
        try:
            transaction = Transaction.objects.get(payment_id=payment_id)
            transaction.status = 'COMPLETED'
            transaction.save()
        except Transaction.DoesNotExist:
            pass


        user = request.user
        user.is_vip = True
        user.save()


        JobPost.objects.filter(employer=user).update(is_featured=True)


        Notification.objects.create(
            user=user,
            title="Thanh toán thành công!",
            body="Cảm ơn bạn đã đồng hành cùng ViCareer. Tài khoản của bạn đã được nâng cấp và các tin tuyển dụng đang được ưu tiên hiển thị.",
            type="SYSTEM_APPROVAL"
        )

        return Response({"message": "Thanh toán thành công. Tài khoản đã được nâng cấp!"},
                        status=status.HTTP_200_OK)
    else:
        return Response({"error": payment.error}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_momo_payment(request):

    amount = "250000"
    order_id = str(uuid.uuid4())
    request_id = str(uuid.uuid4())
    order_info = "Nang cap tai khoan VIP ViCareer qua MoMo"
    request_type = "captureWallet"
    extra_data = ""


    raw_signature = (
        f"accessKey={settings.MOMO_ACCESS_KEY}&amount={amount}&extraData={extra_data}"
        f"&ipnUrl={settings.MOMO_IPN_URL}&orderId={order_id}&orderInfo={order_info}"
        f"&partnerCode={settings.MOMO_PARTNER_CODE}&redirectUrl={settings.MOMO_RETURN_URL}"
        f"&requestId={request_id}&requestType={request_type}"
    )


    signature = hmac.new(
        settings.MOMO_SECRET_KEY.encode('utf-8'),
        raw_signature.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()


    payload = {
        "partnerCode": settings.MOMO_PARTNER_CODE,
        "partnerName": "ViCareer",
        "storeId": "ViCareerStore",
        "requestId": request_id,
        "amount": int(amount),
        "orderId": order_id,
        "orderInfo": order_info,
        "redirectUrl": settings.MOMO_RETURN_URL,
        "ipnUrl": settings.MOMO_IPN_URL,
        "lang": "vi",
        "extraData": extra_data,
        "requestType": request_type,
        "signature": signature
    }

    headers = {'Content-Type': 'application/json'}

    try:
        response = requests.post(settings.MOMO_ENDPOINT, data=json.dumps(payload), headers=headers)
        res_data = response.json()

        print("====== LỖI TỪ MOMO ======")
        print(json.dumps(res_data, indent=4, ensure_ascii=False))
        print("=========================")


        if res_data.get("resultCode") == 0:
            return Response({"payUrl": res_data.get("payUrl")}, status=status.HTTP_200_OK)
        else:
            return Response({"error": res_data.get("message")}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def execute_momo_payment(request):

    result_code = request.data.get('resultCode')
    amount = request.data.get('amount', '250000')
    order_id = request.data.get('orderId')


    if str(result_code) == "0":

        user = request.user
        user.is_vip = True
        user.save()


        JobPost.objects.filter(employer=user).update(is_featured=True)


        Transaction.objects.create(
            user=user,
            payment_id=f"MOMO_{order_id[:20]}",
            amount=f"{int(amount) / 25000:,.1f}",
            status='COMPLETED'
        )


        Notification.objects.create(
            user=user,
            title="Nâng cấp VIP qua MoMo thành công!",
            body="Cảm ơn bạn! Tài khoản của bạn đã nâng cấp VIP thành công bằng ví MoMo.",
            type="SYSTEM_APPROVAL"
        )

        return Response({"message": "Kích hoạt VIP thành công!"}, status=status.HTTP_200_OK)

    return Response({"error": "Thanh toán thất bại hoặc đã bị hủy."}, status=status.HTTP_400_BAD_REQUEST)
