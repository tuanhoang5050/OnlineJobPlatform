from django.shortcuts import render
from django.contrib.admin.views.decorators import staff_member_required
from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum

from users.models import User
from jobs.models import JobPost
from applications.models import Application


@staff_member_required
def system_stats_view(request):
    total_users = User.objects.count()
    total_jobs = JobPost.objects.count()
    total_applications = Application.objects.count()


    total_views = JobPost.objects.aggregate(total_views=Sum('views_count'))['total_views'] or 0

    today = timezone.now().date()
    labels = []
    data = []

    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        count = Application.objects.filter(created_date__date=day).count()
        labels.append(day.strftime("%d/%m"))
        data.append(count)

    context = {
        'title': 'Báo cáo tổng quan hệ thống',
        'total_users': total_users,
        'total_jobs': total_jobs,
        'total_applications': total_applications,
        'total_views': total_views,
        'chart_labels': labels,
        'chart_data': data,
    }

    return render(request, 'admin/system_stats.html', context)