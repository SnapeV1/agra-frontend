import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Course, CourseProgress } from '../models/course';
import { CourseEnrollment, LessonProgress } from './progress.service';

@Injectable({
  providedIn: 'root'
})
export class MockDataService {

  constructor() { }

  getMockCourse(courseId: string): Observable<Course> {
    const mockCourse: Course = {
      id: courseId,
      title: 'Sustainable Agriculture and Crop Management',
      imageUrl: '/assets/agriculture-course.jpg',
      description: 'Learn modern sustainable farming techniques, crop rotation strategies, soil health management, and precision agriculture technologies to maximize yield while protecting the environment.',
      domain: 'Agricultural Sciences',
      country: 'Global',
      trainerId: 'trainer-agri-001',
      languagesAvailable: ['English', 'Spanish', 'French', 'Portuguese'],
      sessionIds: ['session-1', 'session-2', 'session-3', 'session-4', 'session-5'],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15'),
      archived: false,
      activeCall: false,
      goals: [
        'Understand sustainable farming principles and practices',
        'Master crop rotation and soil health management',
        'Learn precision agriculture technologies',
        'Implement integrated pest management strategies',
        'Develop climate-smart agriculture techniques'
      ],
      files: [
        {
          id: 'file-1',
          name: 'Sustainable Agriculture Handbook.pdf',
          url: '/assets/sustainable-agriculture-handbook.pdf',
          type: 'pdf',
          size: 4521440 // 4.3 MB in bytes
        },
        {
          id: 'file-2',
          name: 'Crop Management Templates.xlsx',
          url: '/assets/crop-management-templates.xlsx',
          type: 'xlsx',
          size: 2841632 // 2.7 MB in bytes
        },
        {
          id: 'file-3',
          name: 'Soil Testing Guide.pdf',
          url: '/assets/soil-testing-guide.pdf',
          type: 'pdf',
          size: 1853434 // 1.8 MB in bytes
        },
        {
          id: 'file-4',
          name: 'Precision Agriculture Tools.zip',
          url: '/assets/precision-agriculture-tools.zip',
          type: 'zip',
          size: 12941632 // 12.3 MB in bytes
        }
      ],
      textContent: [
        {
          id: 'lesson-1',
          title: 'Introduction to Sustainable Agriculture',
          order: 1,
          content: `
            <h1>Welcome to Sustainable Agriculture and Crop Management</h1>
            <p>In this comprehensive course, you'll learn modern sustainable farming techniques that balance productivity with environmental stewardship.</p>
            
            <h2>What You'll Learn</h2>
            <ul>
              <li>Principles of sustainable agriculture and regenerative farming</li>
              <li>Soil health assessment and improvement techniques</li>
              <li>Crop rotation strategies and companion planting</li>
              <li>Integrated pest management (IPM) approaches</li>
              <li>Precision agriculture technologies and data-driven farming</li>
              <li>Climate-smart agriculture practices</li>
            </ul>
            
            <h2>Prerequisites</h2>
            <p>Before starting this course, you should have:</p>
            <ul>
              <li>Basic understanding of plant biology and growth cycles</li>
              <li>Familiarity with farming terminology and concepts</li>
              <li>Interest in environmental conservation and sustainability</li>
            </ul>
            
            <h2>Course Structure</h2>
            <p>This course is divided into 5 main modules, each building upon the previous one. You'll work on practical case studies and develop a comprehensive farm management plan that demonstrates real-world applications of sustainable agriculture principles.</p>
            
            <h2>Learning Outcomes</h2>
            <p>By the end of this course, you will be able to:</p>
            <ul>
              <li>Design and implement sustainable farming systems</li>
              <li>Assess and improve soil health using scientific methods</li>
              <li>Create effective crop rotation plans</li>
              <li>Develop integrated pest management strategies</li>
              <li>Utilize precision agriculture tools and technologies</li>
            </ul>
          `,
          type: 'lesson'
        },
        {
          id: 'lesson-2',
          title: 'Soil Health and Crop Rotation Fundamentals',
          order: 2,
          content: `
            <h1>Soil Health and Crop Rotation Fundamentals</h1>
            <p>Learn how to assess, maintain, and improve soil health while implementing effective crop rotation strategies for sustainable farming.</p>
            
            <h2>Understanding Soil Health</h2>
            <p>Soil health is the foundation of sustainable agriculture. Healthy soil supports plant growth, retains water, and maintains biodiversity.</p>
            
            <h3>Key Soil Health Indicators</h3>
            <ul>
              <li>Organic matter content (target: 3-5%)</li>
              <li>Soil pH levels (optimal range varies by crop)</li>
              <li>Nutrient availability (N, P, K, and micronutrients)</li>
              <li>Soil structure and compaction levels</li>
              <li>Biological activity and microbial diversity</li>
            </ul>
            
            <h3>Soil Testing Methods</h3>
            <ul>
              <li>Chemical analysis for nutrient content</li>
              <li>Physical tests for texture and structure</li>
              <li>Biological assessments for microbial activity</li>
              <li>Regular monitoring and record keeping</li>
            </ul>
            
            <h2>Crop Rotation Principles</h2>
            <p>Effective crop rotation helps break pest cycles, improve soil fertility, and maximize land productivity:</p>
            <ul>
              <li>Nitrogen-fixing legumes followed by nitrogen-demanding crops</li>
              <li>Deep-rooted crops alternating with shallow-rooted ones</li>
              <li>Different plant families to break disease cycles</li>
              <li>Cover crops for soil protection and improvement</li>
            </ul>
            
            <h2>Practical Exercise</h2>
            <p>Design a 4-year crop rotation plan for a mixed farming operation, considering soil health, market demands, and pest management.</p>
          `,
          type: 'lesson'
        },
        {
          id: 'lesson-3',
          title: 'Precision Agriculture and Technology Integration',
          order: 3,
          content: `
            <h1>Precision Agriculture and Technology Integration</h1>
            <p>Master modern agricultural technologies to optimize crop production, reduce waste, and improve farm efficiency through data-driven decision making.</p>
            
            <h2>What is Precision Agriculture?</h2>
            <p>Precision agriculture uses technology to observe, measure, and respond to variability in crops and fields, offering:</p>
            <ul>
              <li>Site-specific crop management</li>
              <li>Optimized input usage (fertilizers, pesticides, water)</li>
              <li>Improved yield and quality</li>
              <li>Reduced environmental impact</li>
              <li>Enhanced profitability</li>
            </ul>
            
            <h2>Key Technologies</h2>
            
            <h3>GPS and GIS Systems</h3>
            <p>Global Positioning Systems and Geographic Information Systems enable precise field mapping and navigation.</p>
            
            <h3>Remote Sensing</h3>
            <p>Satellite imagery and drone technology for crop monitoring:</p>
            <ul>
              <li>NDVI (Normalized Difference Vegetation Index) analysis</li>
              <li>Thermal imaging for stress detection</li>
              <li>Multispectral imaging for disease identification</li>
            </ul>
            
            <h3>Variable Rate Technology (VRT)</h3>
            <p>Automated systems that adjust input application rates based on field conditions:</p>
            <ul>
              <li>Variable rate seeding</li>
              <li>Precision fertilizer application</li>
              <li>Targeted pesticide spraying</li>
            </ul>
            
            <h3>IoT Sensors and Monitoring</h3>
            <p>Internet of Things devices for real-time field monitoring:</p>
            <ul>
              <li>Soil moisture sensors</li>
              <li>Weather stations</li>
              <li>Crop growth monitors</li>
              <li>Livestock tracking systems</li>
            </ul>
            
            <h2>Implementation Strategy</h2>
            <ol>
              <li>Assess current farm operations and technology needs</li>
              <li>Start with basic GPS guidance systems</li>
              <li>Implement soil testing and mapping</li>
              <li>Add variable rate application equipment</li>
              <li>Integrate data management systems</li>
              <li>Expand to advanced monitoring and analytics</li>
            </ol>
            
            <h2>Data Management</h2>
            <p>Effective data collection, storage, and analysis are crucial for precision agriculture success. Learn to use farm management software and interpret agricultural data for informed decision-making.</p>
          `,
          type: 'lesson'
        },
        {
          id: 'assignment-1',
          title: 'Develop a Comprehensive Farm Management Plan',
          order: 4,
          content: `
            <h1>Assignment: Comprehensive Farm Management Plan</h1>
            <p>Apply your sustainable agriculture knowledge by creating a detailed farm management plan for a 100-hectare mixed farming operation.</p>
            
            <h2>Farm Scenario</h2>
            <p>You are managing a 100-hectare farm in a temperate climate zone with the following characteristics:</p>
            <ul>
              <li>Soil type: Mixed loam and clay soils</li>
              <li>Annual rainfall: 800mm</li>
              <li>Growing season: 180 days</li>
              <li>Current soil pH: 6.2-6.8</li>
              <li>Organic matter: 2.1% (needs improvement)</li>
            </ul>
            
            <h2>Assignment Requirements</h2>
            
            <h3>1. Crop Rotation Plan (25 points)</h3>
            <ul>
              <li>Design a 4-year crop rotation schedule</li>
              <li>Include at least 3 different crop families</li>
              <li>Incorporate nitrogen-fixing legumes</li>
              <li>Plan for cover crops during off-seasons</li>
              <li>Justify your rotation choices</li>
            </ul>
            
            <h3>2. Soil Health Improvement Strategy (25 points)</h3>
            <ul>
              <li>Develop a plan to increase organic matter to 4%</li>
              <li>Recommend soil testing schedule and methods</li>
              <li>Design composting and organic amendment program</li>
              <li>Address any pH or nutrient deficiencies</li>
            </ul>
            
            <h3>3. Integrated Pest Management Plan (25 points)</h3>
            <ul>
              <li>Identify potential pests and diseases for your chosen crops</li>
              <li>Develop prevention strategies</li>
              <li>Create monitoring protocols</li>
              <li>Plan biological and cultural control methods</li>
              <li>Establish thresholds for intervention</li>
            </ul>
            
            <h3>4. Technology Integration Plan (25 points)</h3>
            <ul>
              <li>Recommend precision agriculture technologies</li>
              <li>Design a phased implementation strategy</li>
              <li>Estimate costs and expected returns</li>
              <li>Plan for data collection and analysis</li>
            </ul>
            
            <h2>Deliverables</h2>
            <ol>
              <li>Executive summary (1 page)</li>
              <li>Detailed farm management plan (8-10 pages)</li>
              <li>Crop rotation calendar with visual timeline</li>
              <li>Budget analysis and financial projections</li>
              <li>Risk assessment and mitigation strategies</li>
            </ol>
            
            <h2>Evaluation Criteria</h2>
            <ul>
              <li>Scientific accuracy and application of course concepts</li>
              <li>Feasibility and practicality of recommendations</li>
              <li>Integration of sustainable agriculture principles</li>
              <li>Quality of analysis and justification</li>
              <li>Professional presentation and organization</li>
            </ul>
            
            <h2>Submission Guidelines</h2>
            <p>Submit your completed assignment with:</p>
            <ul>
              <li>PDF document with all deliverables</li>
              <li>Excel spreadsheet with financial calculations</li>
              <li>Visual aids (charts, diagrams, maps)</li>
              <li>Reference list with at least 10 credible sources</li>
            </ul>
          `,
          type: 'assignment'
        },
        {
          id: 'lesson-4',
          title: 'Performance Optimization',
          order: 5,
          content: `
            <h1>Performance Optimization in Angular</h1>
            <p>Learn techniques to make your Angular applications lightning fast.</p>
            
            <h2>Change Detection Strategy</h2>
            <p>Optimize change detection for better performance:</p>
            
            <h3>OnPush Strategy</h3>
            <pre><code>
@Component({
  selector: 'app-optimized',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`...\`
})
export class OptimizedComponent { }
            </code></pre>
            
            <h2>Lazy Loading</h2>
            <p>Load modules only when needed:</p>
            <pre><code>
const routes: Routes = [
  {
    path: 'feature',
    loadChildren: () => import('./feature/feature.module').then(m => m.FeatureModule)
  }
];
            </code></pre>
            
            <h2>Virtual Scrolling</h2>
            <p>Handle large lists efficiently with CDK virtual scrolling.</p>
            
            <h2>Bundle Optimization</h2>
            <ul>
              <li>Tree shaking</li>
              <li>Code splitting</li>
              <li>Preloading strategies</li>
              <li>Service workers</li>
            </ul>
            
            <h2>Memory Management</h2>
            <ul>
              <li>Unsubscribe from observables</li>
              <li>Use async pipe when possible</li>
              <li>Avoid memory leaks in components</li>
            </ul>
            
            <h2>Performance Monitoring</h2>
            <p>Tools and techniques for measuring performance:</p>
            <ul>
              <li>Angular DevTools</li>
              <li>Chrome DevTools</li>
              <li>Lighthouse audits</li>
              <li>Bundle analyzers</li>
            </ul>
          `,
          type: 'lesson'
        }
      ]
    };

    return of(mockCourse);
  }

  getMockCourseEnrollment(courseId: string): Observable<CourseEnrollment> {
    // Only include lessons that actually exist in the course content
    const mockLessons: LessonProgress[] = [
      {
        lessonId: 'lesson-1',
        completed: true,
        timeSpent: 18,
        completedAt: new Date('2024-01-15'),
        lastAccessedAt: new Date('2024-01-15')
      },
      {
        lessonId: 'lesson-2',
        completed: true,
        timeSpent: 28,
        completedAt: new Date('2024-01-16'),
        lastAccessedAt: new Date('2024-01-16')
      },
      {
        lessonId: 'lesson-3',
        completed: false,
        timeSpent: 15,
        lastAccessedAt: new Date('2024-01-17')
      },
      {
        lessonId: 'assignment-1',
        completed: false,
        timeSpent: 45,
        lastAccessedAt: new Date('2024-01-17')
      }
      // Removed lesson-4 as it doesn't exist in the actual course content
    ];

    const mockProgress: CourseProgress = {
      courseId: courseId,
      enrolledAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      startedAt: new Date('2024-01-15'),
      lastAccessedAt: new Date('2024-01-17'),
      completedAt: new Date(), // Will be updated when course is completed
      completed: false,
      completionPercentage: 40,
      completedSessionIds: ['session-1', 'session-2'],
      currentSessionId: 'session-3',
      totalSessions: 5,
      totalTimeSpent: 106,
      accessCount: 15
    };

    const mockEnrollment: CourseEnrollment = {
      courseId: courseId,
      progress: mockProgress,
      lessons: mockLessons,
      currentLessonId: 'lesson-3'
    };

    return of(mockEnrollment);
  }

  getMockEnrolledCourses(): Observable<CourseProgress[]> {
    const mockEnrolledCourses: CourseProgress[] = [
      {
        courseId: 'course-1',
        enrolledAt: new Date('2024-01-08'),
        startedAt: new Date('2024-01-10'),
        lastAccessedAt: new Date('2024-01-17'),
        completedAt: undefined,
        completed: false,
        completionPercentage: 65,
        completedSessionIds: ['session-1', 'session-2', 'session-3'],
        currentSessionId: 'session-4',
        totalSessions: 6,
        totalTimeSpent: 180,
        accessCount: 12
      },
      {
        courseId: 'course-2',
        enrolledAt: new Date('2024-01-03'),
        startedAt: new Date('2024-01-05'),
        lastAccessedAt: new Date('2024-01-16'),
        completedAt: new Date('2024-01-15'),
        completed: true,
        completionPercentage: 100,
        completedSessionIds: ['session-1', 'session-2', 'session-3', 'session-4'],
        currentSessionId: undefined,
        totalSessions: 4,
        totalTimeSpent: 240,
        accessCount: 20
      },
      {
        courseId: 'course-3',
        enrolledAt: new Date('2024-01-10'),
        startedAt: new Date('2024-01-12'),
        lastAccessedAt: new Date('2024-01-17'),
        completedAt: undefined,
        completed: false,
        completionPercentage: 30,
        completedSessionIds: ['session-1'],
        currentSessionId: 'session-2',
        totalSessions: 5,
        totalTimeSpent: 90,
        accessCount: 8
      }
    ];

    return of(mockEnrolledCourses);
  }
}