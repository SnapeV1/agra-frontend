import { Component, type OnInit, type OnDestroy } from "@angular/core"
import { AnalyticsService } from "src/app/core/services/analytics.service";
import { forkJoin, of } from "rxjs";
import { catchError, map, tap } from "rxjs/operators";
import { ChartData, ChartOptions, ChartType, Chart, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend } from 'chart.js';

interface Metric {
  title: string
  value: string
  change: string
  changeClass: string
  changeIcon: string
  icon: string
  iconClass: string
}

interface Country {
  name: string
  flag: string
  students: number
  percentage: number
}

interface Course {
  name: string
  students: number
  completion: number
  rating: number
  icon: string
  iconClass: string
}

interface GrowthPoint {
  label: string
  count: number
  date: Date
}

@Component({
  selector: 'app-dashboard-admin',
  templateUrl: './dashboard-admin.component.html',
  styleUrls: ['./dashboard-admin.component.css']
})
export class DashboardAdminComponent implements OnInit, OnDestroy {
  metrics: Metric[] = []
  otherMetrics: Metric[] = []

  studentDistribution: Country[] = [
    { name: "United States", flag: "🇺🇸", students: 8420, percentage: 34.3 },
    { name: "United Kingdom", flag: "🇬🇧", students: 3680, percentage: 15.0 },
    { name: "Canada", flag: "🇨🇦", students: 2940, percentage: 12.0 },
    { name: "Australia", flag: "🇦🇺", students: 2210, percentage: 9.0 },
    { name: "Germany", flag: "🇩🇪", students: 1970, percentage: 8.0 },
    { name: "France", flag: "🇫🇷", students: 1720, percentage: 7.0 },
    { name: "India", flag: "🇮🇳", students: 1480, percentage: 6.0 },
    { name: "Others", flag: "🌍", students: 2160, percentage: 8.7 },
  ]

  topCourses: Course[] = []
  userGrowth: GrowthPoint[] = []
  userGrowthMax = 0
  totalUsersDisplay = '0'
  liveUsersOnline = 0
  usersTotal = 0
  usersActive30 = 0
  rolesList: { role: string; count: number }[] = []
  coursesSummary = { published: 0, archived: 0, total: 0 }
  // Social + notifications + registrations
topPostsList: {
  content: string;
  author: string;
  authorImage: string;
  engagement: number;
}[] = [];
  engagementAverages: Record<string, any> | null = null
  featuredPerformance: Record<string, any> | null = null
  registrationsSeries: { label: string; count: number }[] = []
  notificationRead: Record<string, any> | null = null
  notificationTopTypes: { type: string; count: number }[] = []

  // Chart.js setup for user growth (line chart)
  public growthChartType: 'line' = 'line'
  public growthChartData: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'New Users',
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79,70,229,0.15)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#4f46e5',
        pointBorderColor: '#ffffff',
      }
    ]
  }
  public growthChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.parsed.y} users`
        }
      }
    },
    scales: {
      x: { grid: { color: 'rgba(148,163,184,0.2)' }, ticks: { color: '#64748b' } },
      y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.2)' }, ticks: { color: '#64748b', precision: 0 } }
    }
  }
  private themeObserver?: MutationObserver
  // Additional charts (social/notifications)
  public postsChartData: ChartData<'line'> = { labels: [], datasets: [{ data: [], label: 'Posts', borderColor: '#4f46e5', backgroundColor: 'rgba(79,70,229,0.15)', fill: true, tension: 0.35 }] }
  public commentsChartData: ChartData<'line'> = { labels: [], datasets: [{ data: [], label: 'Comments', borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.15)', fill: true, tension: 0.35 }] }
  public notificationsChartData: ChartData<'line'> = { labels: [], datasets: [{ data: [], label: 'Notifications', borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.15)', fill: true, tension: 0.35 }] }

  constructor(private analytics: AnalyticsService) {}

  ngOnInit(): void {
    Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend)
    // Apply theme-aware chart styling now and on theme changes
    this.applyChartTheme()
    try {
      this.themeObserver = new MutationObserver(() => this.applyChartTheme())
      const root = document.documentElement
      this.themeObserver.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    } catch {}
    this.loadDashboard()
  }

  ngOnDestroy(): void {
    try { this.themeObserver?.disconnect() } catch {}
  }

  private loadDashboard(): void {
    const enrollments$ = this.analytics.getEnrollments('daily').pipe(
      catchError(() => of([]))
    )
    const courseSummary$ = this.analytics.getCourseSummary().pipe(
      catchError(() => of({}))
    )
    const completion$ = this.analytics.getCompletionRates().pipe(
      catchError(() => of([]))
    )
    const certificates$ = this.analytics.getCertificates('monthly').pipe(
      catchError(() => of([]))
    )
    const roles$ = this.analytics.getRolesBreakdown().pipe(
      catchError(() => of({}))
    )
    const geo$ = this.analytics.getGeoBreakdown().pipe(
      catchError(() => of({}))
    )
    const topCourses$ = this.analytics.getTopCourses('enrollments', 4).pipe(
      catchError(() => of([]))
    )
    const userGrowth$ = this.analytics.getUserGrowth('monthly').pipe(
      catchError(() => of([]))
    )
    const wsActive$ = this.analytics.getWebsocketActive().pipe(
      catchError(() => of({}))
    )
    const activeUsers$ = this.analytics.getActiveUsers(30).pipe(
      catchError(() => of({}))
    )
    const registrations$ = this.analytics.getNewRegistrations('weekly').pipe(
      catchError(() => of([]))
    )
    const postsTrend$ = this.analytics.getPostsTrend('weekly').pipe(
      catchError(() => of([]))
    )
    const topPosts$ = this.analytics.getTopPosts(5).pipe(
      catchError(() => of([]))
    )
    const commentsTrend$ = this.analytics.getCommentsTrend('weekly').pipe(
      catchError(() => of([]))
    )
    const engagementAvg$ = this.analytics.getEngagementAverages().pipe(
      catchError(() => of({}))
    )
    const featuredPerf$ = this.analytics.getFeaturedPerformance().pipe(
      catchError(() => of({}))
    )
    const notifTrend$ = this.analytics.getNotificationsTrend('weekly').pipe(
      catchError(() => of([]))
    )
    const notifRead$ = this.analytics.getNotificationReadStatus().pipe(
      catchError(() => of({}))
    )
    const notifTypes$ = this.analytics.getTopNotificationTypes().pipe(
      catchError(() => of({}))
    )

    forkJoin({ enrollments$, courseSummary$, completion$, certificates$, roles$, geo$, topCourses$, userGrowth$, wsActive$, activeUsers$, registrations$, postsTrend$, topPosts$, commentsTrend$, engagementAvg$, featuredPerf$, notifTrend$, notifRead$, notifTypes$ })
      .pipe(
        map((data) => {
          
          const totalUsers = this.sumObjectValues(data.roles$)
          const publishedCourses = this.pickNumber(data.courseSummary$, ['published', 'active', 'activeCount', 'activeCourses', 'active_courses', 'Active'])
          const archivedCourses = this.pickNumber(data.courseSummary$, ['archived'])
          const totalCourses = this.pickNumber(data.courseSummary$, ['total', 'all', 'count'])
          const avgCompletion = this.averageFromArray(data.completion$, ['completion', 'completionRate', 'rate'])
          const certificatesThisPeriod = this.sumArrayValues(data.certificates$, ['count', 'value', 'total'])
          this.coursesSummary = { published: publishedCourses, archived: archivedCourses, total: totalCourses }

          // Build metrics
          this.metrics = [
            { title: 'Total Users', value: this.formatNumber(totalUsers), change: '', changeClass: '', changeIcon: 'fas fa-arrow-up', icon: 'fas fa-users', iconClass: 'users' },
            { title: 'Active Courses', value: this.formatNumber(publishedCourses), change: '', changeClass: '', changeIcon: 'fas fa-arrow-up', icon: 'fas fa-book-open', iconClass: 'courses' },
            { title: 'Archived Courses', value: this.formatNumber(archivedCourses), change: '', changeClass: '', changeIcon: 'fas fa-arrow-up', icon: 'fas fa-archive', iconClass: 'archived' },
            { title: 'Total Courses', value: this.formatNumber(totalCourses), change: '', changeClass: '', changeIcon: 'fas fa-arrow-up', icon: 'fas fa-layer-group', iconClass: 'total' },
            { title: 'Certificates Issued', value: this.formatNumber(certificatesThisPeriod), change: '', changeClass: '', changeIcon: 'fas fa-arrow-up', icon: 'fas fa-certificate', iconClass: 'certificates' },
          ]
          // Expose only non-user/non-course totals in Overview
          const hidden = new Set(['Total Users','Active Courses','Archived Courses','Total Courses'])
          this.otherMetrics = this.metrics.filter(m => !hidden.has(m.title))
          
          // Cache total users string for template use
          const tu = this.metrics.find(m => m.title === 'Total Users')?.value
          this.totalUsersDisplay = typeof tu === 'string' ? tu : this.formatNumber(Number(tu || 0))
          this.usersTotal = totalUsers
          this.rolesList = Object.entries(data.roles$ || {})
            .map(([role, count]) => ({ role, count: Number(count) || 0 }))
            .sort((a, b) => b.count - a.count)

          // Student distribution (geo)
          const geoEntries = Object.entries(data.geo$ || {})
          const totalGeo = geoEntries.reduce((a, [, v]) => a + (typeof v === 'number' ? v : 0), 0)
          this.studentDistribution = geoEntries.map(([name, count]) => ({
            name,
            flag: '',
            students: Number(count) || 0,
            percentage: totalGeo ? Math.round(((Number(count) || 0) / totalGeo) * 1000) / 10 : 0,
          }))
          

          // Build a lookup for completion rate by course id/title
          const completionLookup = new Map<string, number>()
          for (const item of (data.completion$ as any[])) {
            const keys = ['courseId','id','course','title','name']
            const compKeys = ['completion','completionRate','rate','value']
            const idOrTitle = (keys.map(k => (item?.[k] ?? '')).find(v => typeof v === 'string' && v.trim()) || '').toString()
            const compRaw = compKeys.map(k => item?.[k]).find(v => typeof v === 'number') as number | undefined
            if (idOrTitle && typeof compRaw === 'number') {
              const key1 = idOrTitle.toString().toLowerCase()
              completionLookup.set(key1, this.normalizePercent(compRaw))
            } else {
              
            }
          }
          

          // Top courses
          this.topCourses = (data.topCourses$ as any[]).map((c: any) => ({
            name: c.title || c.name || c.course || 'Course',
            students: Number(c.enrollments || c.count || c.value || 0),
            completion: (() => {
              const id = (c.id || c.courseId || '').toString().toLowerCase()
              const title = (c.title || c.name || c.course || '').toString().toLowerCase()
              let comp = (id && completionLookup.get(id)) ?? (title && completionLookup.get(title)) ?? 0
              // silent when completion not matched; defaults to 0
              return comp
            })(),
            rating: 0,
            icon: 'fas fa-book',
            iconClass: 'course'
          }))
          

          // User growth series (monthly)
          const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
          const growthArr = (data.userGrowth$ as any[])
            .map((g: any) => {
              const d = new Date(g.periodStart || g.date || g.period || 0)
              const label = isNaN(d.getTime()) ? '' : `${months[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`
              return { label, count: Number(g.count || g.value || 0), date: d } as GrowthPoint
            })
            .filter(pt => pt.label)
            .sort((a, b) => a.date.getTime() - b.date.getTime())

          this.userGrowth = growthArr
          this.userGrowthMax = Math.max(1, ...growthArr.map(g => g.count))
          

          // Update chart data
          this.growthChartData = {
            labels: growthArr.map(g => g.label),
            datasets: [
              { ...(this.growthChartData.datasets[0] as any), data: growthArr.map(g => g.count) }
            ]
          }
          // Ensure theme colors are applied to the dataset as well
          this.applyChartTheme()

          // Live users online (fallback across possible keys)
          const ws = (data.wsActive$ as any) || {}
          this.liveUsersOnline = Number(ws.active || ws.connections || ws.connected || ws.users ||  ws.connectedUsers || 0)
          const au = (data.activeUsers$ as any) || {}
          this.usersActive30 = Number(au.active || au.count || au.users || 0)
          // Registrations series (weekly)
          this.registrationsSeries = (data.registrations$ as any[]).map((r: any) => {
            const d = new Date(r.periodStart || r.date || r.period || 0)
            const label = isNaN(d.getTime()) ? '' : `${months[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`
            return { label, count: Number(r.count || r.value || 0) }
          }).filter(x => x.label)

          // Posts/comments/notifications trend charts
          const mapTrend = (arr: any[]) => arr.map((t: any) => ({ d: new Date(t.periodStart || t.date || t.period || 0), c: Number(t.count || t.value || 0) }))
            .filter(x => !isNaN(x.d.getTime())).sort((a,b)=>a.d.getTime()-b.d.getTime())
          const fmt = (d: Date) => `${months[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`
          const postsT = mapTrend(data.postsTrend$ as any[])
          const commentsT = mapTrend(data.commentsTrend$ as any[])
          const notifT = mapTrend(data.notifTrend$ as any[])
          this.postsChartData = { labels: postsT.map(x=>fmt(x.d)), datasets: [{ ...(this.postsChartData.datasets[0] as any), data: postsT.map(x=>x.c) }] }
          this.commentsChartData = { labels: commentsT.map(x=>fmt(x.d)), datasets: [{ ...(this.commentsChartData.datasets[0] as any), data: commentsT.map(x=>x.c) }] }
          this.notificationsChartData = { labels: notifT.map(x=>fmt(x.d)), datasets: [{ ...(this.notificationsChartData.datasets[0] as any), data: notifT.map(x=>x.c) }] }

          // Top posts simple list
this.topPostsList = (data.topPosts$ as any[]).map((p: any) => ({
  id: p._id?.$oid || p._id || '',
  content: p.content || '',
  author: p.user_info?.name || 'Unknown User',
  authorImage: p.user_info?.picture || '',
  engagement: Number(p.engagement || p.likes_count || 0)
}));
console.log(this.topPostsList)
          // Engagement averages + featured performance
          this.engagementAverages = (data.engagementAvg$ as any) || null
          this.featuredPerformance = (data.featuredPerf$ as any) || null

          // Notifications status + types
          this.notificationRead = (data.notifRead$ as any) || null
          this.notificationTopTypes = Object.entries((data.notifTypes$ as any) || {}).map(([type, count]) => ({ type, count: Number(count) || 0 }))
        })
      )
      .subscribe({
        error: (e) => {
          
        }
      })
  }

  private sumObjectValues(obj: any): number {
    try { return Object.values(obj || {}).reduce((a: number, v: any) => a + (typeof v === 'number' ? v : 0), 0) } catch { return 0 }
  }

  private pickNumber(obj: any, keys: string[]): number {
    for (const k of keys) {
      const val = obj?.[k]
      if (typeof val === 'number') return val
    }
    return 0
  }

  private averageFromArray(arr: any[], keys: string[]): number {
    const nums: number[] = []
    for (const item of arr || []) {
      for (const k of keys) {
        const v = item?.[k]
        if (typeof v === 'number') { nums.push(v); break }
      }
    }
    if (!nums.length) return 0
    return nums.reduce((a, b) => a + b, 0) / nums.length
  }

  private sumArrayValues(arr: any[], keys: string[]): number {
    let sum = 0
    for (const item of arr || []) {
      for (const k of keys) {
        const v = item?.[k]
        if (typeof v === 'number') { sum += v; break }
      }
    }
    return sum
  }

  private formatNumber(n: number): string { try { return n.toLocaleString() } catch { return String(n) } }

  private normalizePercent(v: number): number {
    // Accept either [0..1] or [0..100]
    if (v <= 1) return Math.round(v * 1000) / 10
    return Math.round(v * 10) / 10
  }

  getBarHeight(count: number): number {
    if (!this.userGrowthMax) return 0
    return Math.round((count / this.userGrowthMax) * 100)
  }

  private isDarkTheme(): boolean {
    try {
      const val = document.documentElement.getAttribute('data-theme') || document.body.getAttribute('data-theme') || ''
      return val.toLowerCase() === 'dark'
    } catch { return false }
  }

  private applyChartTheme(): void {
    const dark = this.isDarkTheme()
    const axis = dark ? '#94a3b8' : '#64748b'
    const grid = 'rgba(148,163,184,0.2)'
    const stroke = dark ? '#10b981' : '#4f46e5'
    const fill = dark ? 'rgba(16,185,129,0.15)' : 'rgba(79,70,229,0.15)'

    // Update options
    this.growthChartOptions = {
      ...this.growthChartOptions,
      plugins: { ...(this.growthChartOptions.plugins || {}), legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.parsed.y} users` } } },
      scales: {
        x: { grid: { color: grid }, ticks: { color: axis } },
        y: { beginAtZero: true, grid: { color: grid }, ticks: { color: axis, precision: 0 } }
      }
    }

    // Update dataset colors
    const base = (this.growthChartData.datasets?.[0] as any) || {}
    this.growthChartData = {
      labels: this.growthChartData.labels || [],
      datasets: [
        {
          ...base,
          borderColor: stroke,
          backgroundColor: fill,
          pointBackgroundColor: stroke,
          pointBorderColor: '#ffffff'
        }
      ]
    }
  }

  getStars(rating: number): number[] {
    return Array(Math.floor(rating)).fill(0)
  }
}
