import { Component, type OnInit } from "@angular/core"

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

@Component({
  selector: 'app-dashboard-admin',
  templateUrl: './dashboard-admin.component.html',
  styleUrls: ['./dashboard-admin.component.css']
})
export class DashboardAdminComponent implements OnInit {
  metrics: Metric[] = [
    {
      title: "Total Students",
      value: "24,580",
      change: "+12.5% from last month",
      changeClass: "positive",
      changeIcon: "fas fa-arrow-up",
      icon: "fas fa-users",
      iconClass: "users",
    },
    {
      title: "Monthly Revenue",
      value: "$89,240",
      change: "+8.2% from last month",
      changeClass: "positive",
      changeIcon: "fas fa-arrow-up",
      icon: "fas fa-dollar-sign",
      iconClass: "revenue",
    },
    {
      title: "Active Courses",
      value: "156",
      change: "+5 new this month",
      changeClass: "positive",
      changeIcon: "fas fa-arrow-up",
      icon: "fas fa-book-open",
      iconClass: "courses",
    },
    {
      title: "Avg Completion",
      value: "87.3%",
      change: "+3.1% improvement",
      changeClass: "positive",
      changeIcon: "fas fa-arrow-up",
      icon: "fas fa-chart-line",
      iconClass: "completion",
    },
    {
      title: "Instructors",
      value: "89",
      change: "+7 new instructors",
      changeClass: "positive",
      changeIcon: "fas fa-arrow-up",
      icon: "fas fa-chalkboard-teacher",
      iconClass: "instructors",
    },
    {
      title: "Certificates Issued",
      value: "12,847",
      change: "+15.3% this month",
      changeClass: "positive",
      changeIcon: "fas fa-arrow-up",
      icon: "fas fa-certificate",
      iconClass: "certificates",
    },
    {
      title: "Student Satisfaction",
      value: "4.8/5",
      change: "+0.2 improvement",
      changeClass: "positive",
      changeIcon: "fas fa-arrow-up",
      icon: "fas fa-smile",
      iconClass: "satisfaction",
    },
    {
      title: "Platform Growth",
      value: "+23.4%",
      change: "Year over year",
      changeClass: "positive",
      changeIcon: "fas fa-arrow-up",
      icon: "fas fa-trending-up",
      iconClass: "growth",
    },
  ]

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

  topCourses: Course[] = [
    {
      name: "JavaScript Fundamentals",
      students: 3420,
      completion: 92,
      rating: 4.8,
      icon: "fab fa-js-square",
      iconClass: "javascript",
    },
    {
      name: "React Development",
      students: 2890,
      completion: 88,
      rating: 4.7,
      icon: "fab fa-react",
      iconClass: "react",
    },
    {
      name: "Python for Beginners",
      students: 2650,
      completion: 85,
      rating: 4.6,
      icon: "fab fa-python",
      iconClass: "python",
    },
    {
      name: "UI/UX Design",
      students: 2180,
      completion: 90,
      rating: 4.9,
      icon: "fas fa-palette",
      iconClass: "design",
    },
  ]

  constructor() {}

  ngOnInit(): void {
    // Component initialization logic here
  }

  getStars(rating: number): number[] {
    return Array(Math.floor(rating)).fill(0)
  }
}
