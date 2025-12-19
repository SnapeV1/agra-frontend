import { Component, type OnInit, type OnDestroy } from "@angular/core"
import { ActivatedRoute, Router } from "@angular/router"
import { AnalyticsService } from "src/app/core/services/analytics.service";
import { LanguageService } from "src/app/core/services/language.service";
import { PresenceService } from "src/app/core/services/presence.service";
import { TicketService } from "src/app/core/services/ticket.service";
import { Ticket, TicketStatus } from "src/app/core/models/ticket.model";
import { forkJoin, of, Subject } from "rxjs";
import { catchError, map, takeUntil } from "rxjs/operators";
import { ChartData, ChartOptions, Chart, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend } from 'chart.js';
interface LiveCountry {
  name: string;
  code: string;
  users: number;
  lat: number;
  lng: number;
  x?: number;
  y?: number;
}


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

interface StatTile {
  label: string
  value: string
  sub?: string
  subKey?: string
  subValue?: string
}

@Component({
  selector: 'app-dashboard-admin',
  templateUrl: './dashboard-admin.component.html',
  styleUrls: ['./dashboard-admin.component.css']
})
export class DashboardAdminComponent implements OnInit, OnDestroy {
  metrics: Metric[] = []
  otherMetrics: Metric[] = []
  averageCompletion = 0
  roleColors: string[] = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#8b5cf6']
  activeSection: 'overview' | 'users' | 'courses' | 'social' | 'notifications' | 'activity' = 'overview'
  languages = [
    { code: 'en', labelKey: 'lang.en' },
    { code: 'fr', labelKey: 'lang.fr' }
  ]
  currentLang = 'en'
  displayPrefsSaved = false

  studentDistribution: Country[] = [
    { name: "United States", flag: "????", students: 8420, percentage: 34.3 },
    { name: "United Kingdom", flag: "????", students: 3680, percentage: 15.0 },
    { name: "Canada", flag: "????", students: 2940, percentage: 12.0 },
    { name: "Australia", flag: "????", students: 2210, percentage: 9.0 },
    { name: "Germany", flag: "????", students: 1970, percentage: 8.0 },
    { name: "France", flag: "????", students: 1720, percentage: 7.0 },
    { name: "India", flag: "????", students: 1480, percentage: 6.0 },
    { name: "Others", flag: "??", students: 2160, percentage: 8.7 },
  ]

  topCourses: Course[] = []
  topCoursesMaxEnrollments = 1
  userGrowth: GrowthPoint[] = []
  userGrowthMax = 0
  totalUsersDisplay = '0'
  liveUsersOnline = 0
  usersTotal = 0
  usersActive30 = 0
  rolesList: { role: string; count: number }[] = []
  coursesSummary = { published: 0, archived: 0, total: 0 }
  // Social + notifications + registrations
  allTopPosts: {
    id?: string;
    content: string;
    author: string;
    authorImage: string;
    engagement: number;
    likes: number;
    comments: number;
    createdAt?: string;
  }[] = [];
  topPostsList: {
    id?: string;
    content: string;
    author: string;
    authorImage: string;
    engagement: number;
    likes: number;
    comments: number;
    createdAt?: string;
  }[] = [];
  showAllPosts = false;
  engagementAverages: Record<string, any> | null = null
  engagementAverageEntries: { label: string; value: string }[] = []
  featuredPerformance: Record<string, any> | null = null
  featuredPerformanceEntries: { label: string; value: string }[] = []
  registrationsSeries: { label: string; count: number }[] = []
  latestRegistrationUser: { name: string; email: string; createdAt?: string } | null = null
  notificationRead: Record<string, any> | null = null
  notificationTopTypes: { type: string; count: number }[] = []
  ticketStats: StatTile[] = []
  recentTickets: Ticket[] = []
  postPulseStats: StatTile[] = []
  coursePulseStats: StatTile[] = []
  courseHighlightStats: StatTile[] = []
  postsPulseLabelKey = 'dashboard.social.pulse.mostRecentPeriod'

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
  public enrollmentsChartType: 'line' = 'line'
  public enrollmentsChartData: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Courses completed',
        borderColor: '#0ea5e9',
        backgroundColor: 'rgba(14,165,233,0.15)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#0ea5e9',
        pointBorderColor: '#ffffff'
      }
    ]
  }
  public enrollmentsChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.parsed.y} courses`
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

  private destroy$ = new Subject<void>()
  northAfricaCountries: LiveCountry[] = [];
  northAfricaUsersTotal = 0;

  constructor(
    private analytics: AnalyticsService,
    private languageService: LanguageService,
    private presenceService: PresenceService,
    private ticketService: TicketService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend)
    // Apply theme-aware chart styling now and on theme changes
    this.applyChartTheme()
    this.currentLang = this.languageService.current
    this.languageService.language$?.subscribe(lang => {
      if (lang) this.currentLang = lang
    })
    try {
      this.themeObserver = new MutationObserver(() => this.applyChartTheme())
      const root = document.documentElement
      this.themeObserver.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    } catch {}
    this.loadDashboard()
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const tab = (params['tab'] || '').toString().toLowerCase()
        const allowed = new Set(['overview', 'users', 'courses', 'social', 'notifications', 'activity'])
        if (tab && allowed.has(tab) && tab !== this.activeSection) {
          this.activeSection = tab as DashboardAdminComponent['activeSection']
        }
      })
    // Re-fetch live presence whenever we get an ACK (ensures self is counted)
    this.presenceService.heartbeatAck$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.refreshLiveUsersOnline())
    // Kick off an early refresh in case the dashboard rendered before the first ACK
    setTimeout(() => this.refreshLiveUsersOnline(), 600)
  }

  ngOnDestroy(): void {
    try { this.themeObserver?.disconnect() } catch {}
    this.destroy$.next()
    this.destroy$.complete()
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
    const latestUser$ = this.analytics.getLatestUser().pipe(
      catchError(() => of(null))
    )
    const postsTrendGranularity: 'daily' | 'weekly' | 'monthly' = 'weekly'
    const postsTrend$ = this.analytics.getPostsTrend(postsTrendGranularity).pipe(
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
    const tickets$ = this.ticketService.getAllTickets().pipe(
      catchError(() => of([]))
    )

    this.postsPulseLabelKey = this.formatPeriodLabel(postsTrendGranularity)
    forkJoin({ enrollments$, courseSummary$, completion$, certificates$, roles$, geo$, topCourses$, userGrowth$, wsActive$, activeUsers$, registrations$, latestUser$, postsTrend$, topPosts$, commentsTrend$, engagementAvg$, featuredPerf$, notifTrend$, notifRead$, notifTypes$, tickets$ })
      .pipe(
        map((data) => {
          
          const totalUsers = this.sumObjectValues(data.roles$)
          const publishedCourses = this.pickNumber(data.courseSummary$, ['published', 'active', 'activeCount', 'activeCourses', 'active_courses', 'Active'])
          const archivedCourses = this.pickNumber(data.courseSummary$, ['archived'])
          const totalCourses = this.pickNumber(data.courseSummary$, ['total', 'all', 'count'])
          const avgCompletion = this.averageFromArray(data.completion$, ['completion', 'completionRate', 'rate'])
          this.averageCompletion = Math.round(avgCompletion * 10) / 10
          const certificatesThisPeriod = this.sumArrayValues(data.certificates$, ['count', 'value', 'total'])
          this.coursesSummary = { published: publishedCourses, archived: archivedCourses, total: totalCourses }

          // Build metrics
          this.metrics = [
            { title: 'Total Users', value: this.formatValue(totalUsers), change: '', changeClass: '', changeIcon: 'fas fa-arrow-up', icon: 'fas fa-users', iconClass: 'users' },
            { title: 'Active Courses', value: this.formatValue(publishedCourses), change: '', changeClass: '', changeIcon: 'fas fa-arrow-up', icon: 'fas fa-book-open', iconClass: 'courses' },
            { title: 'Archived Courses', value: this.formatValue(archivedCourses), change: '', changeClass: '', changeIcon: 'fas fa-arrow-up', icon: 'fas fa-archive', iconClass: 'archived' },
            { title: 'Total Courses', value: this.formatValue(totalCourses), change: '', changeClass: '', changeIcon: 'fas fa-arrow-up', icon: 'fas fa-layer-group', iconClass: 'total' },
            { title: 'Certificates Issued', value: this.formatValue(certificatesThisPeriod), change: '', changeClass: '', changeIcon: 'fas fa-arrow-up', icon: 'fas fa-certificate', iconClass: 'certificates' },
          ]
          // Expose only non-user/non-course totals in Overview
          const hidden = new Set(['Total Users','Active Courses','Archived Courses','Total Courses'])
          this.otherMetrics = this.metrics.filter(m => !hidden.has(m.title))
          
          // Cache total users string for template use
          const tu = this.metrics.find(m => m.title === 'Total Users')?.value
          this.totalUsersDisplay = typeof tu === 'string' ? tu : this.formatValue(Number(tu || 0))
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
            percentage: totalGeo ? Math.round(((Number(count) || 0) / totalGeo) * 10000) / 100 : 0,
          }))

          const geoCounts = this.normalizeGeoCounts(data.geo$ || {});
          const northAfricaSeeds = [
            { code: 'MA', name: 'Morocco', lat: 31.7917, lng: -7.0926, aliases: ['morocco', 'kingdom of morocco'] },
            { code: 'DZ', name: 'Algeria', lat: 28.0339, lng: 1.6596, aliases: ['algeria', "people's democratic republic of algeria"] },
            { code: 'TN', name: 'Tunisia', lat: 33.8869, lng: 9.5375, aliases: ['tunisia', 'republic of tunisia'] },
            { code: 'LY', name: 'Libya', lat: 26.3351, lng: 17.2283, aliases: ['libya', 'libyan arab jamahiriya', 'libya arab jamahiriya'] },
            { code: 'EG', name: 'Egypt', lat: 26.8206, lng: 30.8025, aliases: ['egypt', 'arab republic of egypt'] },
            { code: 'MR', name: 'Mauritania', lat: 21.0079, lng: -10.9408, aliases: ['mauritania', 'islamic republic of mauritania'] },
            { code: 'EH', name: 'Western Sahara', lat: 24.2155, lng: -12.8858, aliases: ['western sahara'] }
          ];

          this.northAfricaCountries = northAfricaSeeds
            .map(item => ({
              code: item.code,
              name: item.name,
              users: this.pickGeoCount(geoCounts, item.aliases),
              lat: item.lat,
              lng: item.lng
            }))
            .sort((a, b) => b.users - a.users);
          this.northAfricaUsersTotal = this.northAfricaCountries.reduce((sum, c) => sum + (c.users || 0), 0);
          

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
          this.topCoursesMaxEnrollments = Math.max(1, ...this.topCourses.map(c => c.students || 0))

          const topByEnrollments = this.topCourses.length ? this.topCourses[0] : null
          const topByCompletion = [...this.topCourses].sort((a, b) => b.completion - a.completion)[0]
          this.courseHighlightStats = [
            topByEnrollments ? {
              label: 'Top course',
              value: topByEnrollments.name,
              sub: `${this.formatValue(topByEnrollments.students)} enrollments · ${this.formatValue(topByEnrollments.completion)}% completion`
            } : null,
            topByCompletion ? {
              label: 'Best completion',
              value: topByCompletion.name,
              sub: `${this.formatValue(topByCompletion.completion)}% completion`
            } : null,
            { label: 'Archived courses', value: this.formatValue(this.coursesSummary.archived) },
            { label: 'Total courses', value: this.formatValue(this.coursesSummary.total) },
          ].filter(Boolean) as StatTile[]
          

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
          // Courses completed pulse (monthly)
          const lessonsArr = (data.certificates$ as any[])
            .map((e: any) => ({ d: new Date(e.periodStart || e.date || e.period || 0), c: Number(e.count || e.value || 0) }))
            .filter(x => !isNaN(x.d.getTime()))
            .sort((a, b) => a.d.getTime() - b.d.getTime())
          const lessonsTotal = lessonsArr.reduce((sum, item) => sum + item.c, 0)
          const lessonsLatest = lessonsArr.length ? lessonsArr[lessonsArr.length - 1].c : 0
          const lessonsAvg = lessonsArr.length ? Math.round((lessonsTotal / lessonsArr.length) * 100) / 100 : 0
          this.coursePulseStats = [
            { label: 'Latest courses completed', value: this.formatValue(lessonsLatest), sub: `Total ${this.formatValue(lessonsTotal)}` },
            { label: 'Avg per period', value: this.formatValue(lessonsAvg) },
            { label: 'Active courses', value: this.formatValue(this.coursesSummary.published) },
            { label: 'Avg completion', value: `${this.formatValue(this.averageCompletion)}%` },
          ].filter(item => item.value !== '0' || lessonsTotal || this.coursesSummary.published || this.averageCompletion)
          const lessonsSlice = lessonsArr.slice(-8)
          const lessonsLabels = lessonsSlice.map(item =>
            item.d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          )
          this.enrollmentsChartData = {
            labels: lessonsLabels,
            datasets: [
              { ...(this.enrollmentsChartData.datasets[0] as any), data: lessonsSlice.map(item => item.c) }
            ]
          }
          // Registrations series (weekly)
          this.registrationsSeries = (data.registrations$ as any[]).map((r: any) => {
            const d = new Date(r.periodStart || r.date || r.period || 0)
            const label = isNaN(d.getTime()) ? '' : `${months[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`
            return { label, count: Number(r.count || r.value || 0) }
          }).filter(x => x.label)
          const latestPayload = (data.latestUser$ as any) || {}
          const latestUser = latestPayload.latestUser || latestPayload.user || latestPayload
          if (latestUser?.name || latestUser?.email) {
            this.latestRegistrationUser = {
              name: latestUser.name || '-',
              email: latestUser.email || '',
              createdAt: latestUser.createdAt || latestUser.created_at || latestUser.registeredAt || latestUser.date || latestUser.timestamp
            }
          } else {
            this.latestRegistrationUser = this.extractLatestRegistration(data.registrations$)
          }

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
          this.allTopPosts = (data.topPosts$ as any[]).map((p: any) => ({
            id: p._id?.$oid || p._id || '',
            content: p.content || '',
            author: p.user_info?.name || 'Unknown User',
            authorImage: p.user_info?.picture || '',
            engagement: Number(p.engagement || p.likes_count || 0),
            likes: Number(p.likes_count || p.likes || p.likesCount || 0),
            comments: Number(p.comments_count || p.comments || p.commentCount || 0),
            createdAt: p.createdAt || p.created_at || p.date || p.timestamp || null,
          }))
          this.topPostsList = this.showAllPosts ? this.allTopPosts : this.allTopPosts.slice(0, 3)
          // Engagement averages + featured performance
          this.engagementAverages = (data.engagementAvg$ as any) || null
          this.engagementAverageEntries = this.normalizeKeyValue(this.engagementAverages)
          this.featuredPerformance = (data.featuredPerf$ as any) || null
          this.featuredPerformanceEntries = this.normalizeKeyValue(this.featuredPerformance)
          // Engagement averages + featured performance
          // Notifications status + types
          this.notificationRead = (data.notifRead$ as any) || null
          this.notificationTopTypes = Object.entries((data.notifTypes$ as any) || {}).map(([type, count]) => ({ type, count: Number(count) || 0 }))

          const postsTotal = postsT.reduce((sum, item) => sum + item.c, 0)
          const commentsTotal = commentsT.reduce((sum, item) => sum + item.c, 0)
          const latestPosts = postsT.length ? postsT[postsT.length - 1].c : 0
          const latestComments = commentsT.length ? commentsT[commentsT.length - 1].c : 0
          const topLike = Math.max(0, ...this.allTopPosts.map(p => p.likes || 0))
          const topComment = Math.max(0, ...this.allTopPosts.map(p => p.comments || 0))
          const avgEngagement = this.allTopPosts.length
            ? (this.allTopPosts.reduce((sum, p) => sum + (p.engagement || 0), 0) / this.allTopPosts.length)
            : 0
          this.postPulseStats = [
            { label: 'dashboard.social.pulse.postsThisPeriod', value: this.formatValue(latestPosts), subKey: 'dashboard.social.pulse.totalWithValue', subValue: this.formatValue(postsTotal) },
            { label: 'dashboard.social.pulse.commentsThisPeriod', value: this.formatValue(latestComments), subKey: 'dashboard.social.pulse.totalWithValue', subValue: this.formatValue(commentsTotal) },
            { label: 'dashboard.social.pulse.avgEngagement', value: this.formatValue(Math.round(avgEngagement * 100) / 100) },
            { label: 'dashboard.social.pulse.topLikes', value: this.formatValue(topLike) },
            { label: 'dashboard.social.pulse.topComments', value: this.formatValue(topComment) },
          ].filter(item => item.value !== '0' || postsTotal || commentsTotal || this.allTopPosts.length)

          const tickets = (data.tickets$ as Ticket[]) || []
          const ticketCounts = {
            [TicketStatus.OPEN]: tickets.filter(t => t.status === TicketStatus.OPEN).length,
            [TicketStatus.PENDING]: tickets.filter(t => t.status === TicketStatus.PENDING).length,
            [TicketStatus.RESOLVED]: tickets.filter(t => t.status === TicketStatus.RESOLVED).length,
            [TicketStatus.CLOSED]: tickets.filter(t => t.status === TicketStatus.CLOSED).length,
          }
          const resolvedCombined = ticketCounts[TicketStatus.RESOLVED] + ticketCounts[TicketStatus.CLOSED]
          const staleCutoff = Date.now() - (7 * 24 * 60 * 60 * 1000)
          const stale = tickets.filter(t => {
            const stamp = t.updatedAt || t.createdAt
            if (!stamp) return false
            const time = new Date(stamp).getTime()
            return !isNaN(time) && time < staleCutoff
          }).length
          const totalTickets = tickets.length
          this.ticketStats = totalTickets ? [
            { label: 'dashboard.tickets.labels.open', value: this.formatValue(ticketCounts[TicketStatus.OPEN]), sub: `${this.formatValue(totalTickets ? Math.round((ticketCounts[TicketStatus.OPEN] / totalTickets) * 100) : 0)}% of total` },
            { label: 'dashboard.tickets.labels.pending', value: this.formatValue(ticketCounts[TicketStatus.PENDING]) },
            { label: 'dashboard.tickets.labels.resolved', value: this.formatValue(resolvedCombined) },
            { label: 'dashboard.tickets.labels.stale', value: this.formatValue(stale) },
          ] : []
          this.recentTickets = tickets
            .slice()
            .sort((a, b) => this.ticketDateValue(b) - this.ticketDateValue(a))
            .slice(0, 4)
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

  public formatValue(value: any): string {
    const num = typeof value === 'string' ? Number(value) : value
    if (typeof num === 'number' && Number.isFinite(num)) {
      const hasFraction = Math.abs(num % 1) > 0
      try {
        return new Intl.NumberFormat(undefined, {
          maximumFractionDigits: 2,
          minimumFractionDigits: hasFraction ? 2 : 0
        }).format(num)
      } catch {}
      return num.toFixed(hasFraction ? 2 : 0)
    }
    if (value === null || value === undefined) return '-'
    return String(value)
  }

  private normalizePercent(v: number): number {
    // Accept either [0..1] or [0..100]
    if (v <= 1) return Math.round(v * 10000) / 100
    return Math.round(v * 100) / 100
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
    const lessonsStroke = dark ? '#38bdf8' : '#0ea5e9'
    const lessonsFill = dark ? 'rgba(56,189,248,0.18)' : 'rgba(14,165,233,0.15)'

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

    this.enrollmentsChartOptions = {
      ...this.enrollmentsChartOptions,
      scales: {
        x: { grid: { color: grid }, ticks: { color: axis } },
        y: { beginAtZero: true, grid: { color: grid }, ticks: { color: axis, precision: 0 } }
      }
    }
    const enrollBase = (this.enrollmentsChartData.datasets?.[0] as any) || {}
    this.enrollmentsChartData = {
      labels: this.enrollmentsChartData.labels || [],
      datasets: [
        {
          ...enrollBase,
          backgroundColor: lessonsFill,
          borderColor: lessonsStroke,
          pointBackgroundColor: lessonsStroke,
          pointBorderColor: '#ffffff'
        }
      ]
    }
  }

  private toFriendlyLabel(key: string): string {
    if (!key) return ''
    return key
      .replace(/[_\s]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .trim()
      .split(' ')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  private normalizeKeyValue(obj: Record<string, any> | null): { label: string; value: string }[] {
    if (!obj) return []
    return Object.entries(obj).map(([key, value]) => ({
      label: this.toFriendlyLabel(key),
      value: this.formatValue(value)
    }))
  }

  getStars(rating: number): number[] {
    return Array(Math.floor(rating)).fill(0)
  }

  private formatPeriodLabel(granularity: 'daily' | 'weekly' | 'monthly'): string {
    switch (granularity) {
      case 'daily':
        return 'dashboard.social.pulse.mostRecentDay'
      case 'weekly':
        return 'dashboard.social.pulse.mostRecentWeek'
      case 'monthly':
        return 'dashboard.social.pulse.mostRecentMonth'
      default:
        return 'dashboard.social.pulse.mostRecentPeriod'
    }
  }

  private extractLatestRegistration(payload: any): { name: string; email: string; createdAt?: string } | null {
    const candidates: { name?: string; email?: string; createdAt?: any }[] = []
    const pushCandidate = (item: any) => {
      if (!item) return
      const name = item.name || item.fullName || item.userName || item.user?.name
      const email = item.email || item.userEmail || item.user?.email
      if (!name && !email) return
      candidates.push({
        name,
        email,
        createdAt: item.createdAt || item.registeredAt || item.date || item.timestamp
      })
    }
    const scan = (item: any) => {
      if (!item) return
      pushCandidate(item.latestUser || item.latestRegistration)
      pushCandidate(item.user)
      if (Array.isArray(item.users)) item.users.forEach(pushCandidate)
      if (Array.isArray(item.items)) item.items.forEach(pushCandidate)
      if (Array.isArray(item.registrations)) item.registrations.forEach(pushCandidate)
      if (Array.isArray(item.data)) item.data.forEach(pushCandidate)
      if (item.name || item.email) pushCandidate(item)
    }
    if (Array.isArray(payload)) {
      payload.forEach(scan)
    } else {
      scan(payload)
    }
    if (!candidates.length) return null
    const dated = candidates.filter(c => c.createdAt)
    if (dated.length) {
      dated.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      const latest = dated[dated.length - 1]
      return { name: latest.name || '-', email: latest.email || '', createdAt: latest.createdAt }
    }
    const latest = candidates[candidates.length - 1]
    return { name: latest.name || '-', email: latest.email || '', createdAt: latest.createdAt }
  }

  formatDate(value: any): string {
    if (!value) return ''
    try {
      const date = new Date(value)
      if (isNaN(date.getTime())) return ''
      return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    } catch {
      return ''
    }
  }

  get latestRegistrationCount(): number {
    if (!this.registrationsSeries || !this.registrationsSeries.length) return 0
    const last = this.registrationsSeries[this.registrationsSeries.length - 1]
    return last?.count || 0
  }

  private refreshLiveUsersOnline(): void {
    this.analytics.getWebsocketActive()
      .pipe(catchError(() => of({})))
      .subscribe(ws => {
        const payload = ws as any
        const preferredKeys = [
          'uniqueUsers', // expected unique user count from presence store
          'unique',
          'onlineUsers',
          'usersOnline',
          'users', // older shape
          'active', // fallback counts (may be connections)
          'connections',
          'connected',
          'connectedUsers',
        ]
        let count: number | undefined
        for (const key of preferredKeys) {
          const v = payload?.[key]
          if (typeof v === 'number' && !Number.isNaN(v)) {
            count = v
            break
          }
        }
        this.liveUsersOnline = Number(count ?? 0)
      })
  }

  onAddCourse(): void {
    this.router.navigate(['/admin/courses'])
  }

  onViewTickets(): void {
    this.router.navigate(['/admin/tickets'])
  }

  setSection(section: DashboardAdminComponent['activeSection']): void {
    this.activeSection = section
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: section },
      queryParamsHandling: 'merge'
    })
  }

  onShowAllPosts(): void {
    this.showAllPosts = true
    this.topPostsList = this.allTopPosts
  }

  onLanguageChange(lang: string): void {
    this.currentLang = lang
    this.languageService.setLanguage(lang)
  }

  saveDisplayPrefs(): void {
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
    try { localStorage.setItem('pref_theme', theme) } catch {}
    this.languageService.setLanguage(this.currentLang || 'en')
    this.displayPrefsSaved = true
    setTimeout(() => this.displayPrefsSaved = false, 1500)
  }
  private normalizeGeoCounts(geo: Record<string, any>): Record<string, number> {
    const normalized: Record<string, number> = {};
    Object.entries(geo || {}).forEach(([key, value]) => {
      const name = (key || '').toString().toLowerCase().trim();
      normalized[name] = Number(value) || 0;
    });
    return normalized;
  }

  private ticketDateValue(ticket: Ticket): number {
    const stamp = ticket.updatedAt || ticket.createdAt
    if (!stamp) return 0
    const time = new Date(stamp).getTime()
    return isNaN(time) ? 0 : time
  }

  statusPillClass(status: TicketStatus | string): string {
    const key = (status || '').toString().toLowerCase()
    return `status-pill ${key}`
  }

  private pickGeoCount(map: Record<string, number>, aliases: string[]): number {
    for (const alias of aliases) {
      const val = map[alias];
      if (typeof val === 'number') return val;
    }
    return 0;
  }

}
