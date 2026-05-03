import { BookOpen, Clock, DollarSign, MessageSquare, Shield, TrendingUp, UserPlus, Users } from 'lucide-react';
import type { ElementType } from 'react';

export interface DashboardExample {
  title: string;
  description: string;
  icon: ElementType;
  category: string;
  features: string[];
}

export const DASHBOARD_EXAMPLES: DashboardExample[] = [
  {
    title: 'Recruitment & Hiring Dashboard',
    description: 'Track open positions, application funnel, time to hire, and recruiting metrics',
    icon: UserPlus,
    category: 'recruitment',
    features: [
      'Open Positions Tracker',
      'Application Funnel Visualization',
      'Time to Hire Metrics',
      'Offer Acceptance Rate',
      'Top Sources of Hire',
      'Candidate Quality Score',
      'Recruiter Activity Feed',
      'Hiring Diversity Snapshot',
    ],
  },
  {
    title: 'Employee Directory & Demographics',
    description: 'Comprehensive view of employee demographics, headcount, and organizational structure',
    icon: Users,
    category: 'demographics',
    features: [
      'Total Headcount by Department',
      'Headcount Over Time',
      'Org Chart Preview',
      'Demographic Distribution',
      'Employee Status Breakdown',
      'New Hires This Month',
      'Attrition Rate',
      'Geographic Distribution',
    ],
  },
  {
    title: 'Performance & Productivity',
    description: 'Monitor employee performance, goal completion, and productivity metrics',
    icon: TrendingUp,
    category: 'performance',
    features: [
      'Goal Completion Rate',
      'Performance Ratings Overview',
      'Top Performers Leaderboard',
      'Probation Completion',
      'Upcoming Performance Reviews',
      '360 Feedback Results',
      'Career Development Progress',
      'Performance Trends',
    ],
  },
  {
    title: 'Engagement & Feedback',
    description: 'Track employee satisfaction, survey results, and engagement metrics',
    icon: MessageSquare,
    category: 'engagement',
    features: [
      'eNPS Score Widget',
      'Survey Participation Rate',
      'Pulse Survey Trends',
      'Feedback Highlights',
      'Recent Shoutouts & Recognition',
      'Exit Interview Insights',
      'Team Engagement Scores',
      'Sentiment Analysis',
    ],
  },
  {
    title: 'Time & Attendance',
    description: 'Monitor work hours, leave balances, and attendance patterns',
    icon: Clock,
    category: 'attendance',
    features: [
      'Leave Balance Summary',
      'Upcoming Leaves',
      'Clock-in Compliance',
      'Absenteeism Rate',
      'Overtime Tracker',
      'Remote Work Analytics',
      'Attendance Trends',
      'Holiday Calendar',
    ],
  },
  {
    title: 'Compensation & Benefits',
    description: 'Track payroll, compensation benchmarking, and benefits enrollment',
    icon: DollarSign,
    category: 'compensation',
    features: [
      'Payroll Status Widget',
      'Compensation Benchmarking',
      'Benefits Enrollment Stats',
      'Bonuses and Incentives Overview',
      'Salary Distribution',
      'Cost per Employee',
      'Benefits Utilization',
      'Equity Tracking',
    ],
  },
  {
    title: 'Learning & Development',
    description: 'Monitor training completion, skill development, and learning paths',
    icon: BookOpen,
    category: 'learning',
    features: [
      'Training Completion Rate',
      'Most Popular Courses',
      'Upcoming Training Sessions',
      'Skill Gap Heatmap',
      'Certification Tracking',
      'Learning Budget Utilization',
      'Career Path Progress',
      'Training ROI Metrics',
    ],
  },
  {
    title: 'Compliance & Operations',
    description: 'Ensure policy compliance, document management, and operational oversight',
    icon: Shield,
    category: 'compliance',
    features: [
      'Policy Acknowledgement Status',
      'Document Expiry Alerts',
      'Audit Trail',
      'Compliance Training Status',
      'Risk Assessment Results',
      'Incident Reporting',
      'Data Privacy Compliance',
      'Regulatory Updates',
    ],
  },
];
