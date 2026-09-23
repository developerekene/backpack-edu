import React from 'react';
import { Course, UserProgress, EnrollmentRequest, OrgMember } from '../../types';
import { TrendingUp, Users, DollarSign, BookOpen } from 'lucide-react';

export const AnalyticsOverview = ({ courses, progressData, enrollmentRequests = [], orgMembers = [] }: { courses: Course[], progressData: UserProgress[], enrollmentRequests?: EnrollmentRequest[], orgMembers?: OrgMember[] }) => {
    
    const orgCourseIds = courses.map(c => c.id);
    const approvedEnrollments = enrollmentRequests.filter(req => req.status === 'approved' && orgCourseIds.includes(req.courseId));
    
    // Calculate actual revenue
    const totalRevenue = approvedEnrollments.reduce((acc, req) => {
        const course = courses.find(c => c.id === req.courseId);
        if (!course) return acc;
        
        let price = course.price;
        if (req.paymentMethod === 'installment') {
            price = Math.ceil(course.price / 3); // simplistic for first installment
        }
        return acc + (price || 0);
    }, 0);

    const activeStudentIds = Array.from(new Set(approvedEnrollments.map(r => r.userId))).filter(userId => {
        const member = orgMembers.find(m => m.id === userId);
        return !member || member.role !== 'instructor';
    });

    const activeStudents = activeStudentIds.length;

    const totalModulesCount = courses.reduce((acc, c) => acc + (c.modules?.length || 0), 0);

    // Real Avg. Retention: % of approved enrolled students who have active progress
    const retainedStudentsCount = activeStudentIds.filter(userId => {
        return progressData.some(p => p.userId === userId && orgCourseIds.includes(p.courseId) && p.completedModuleIds.length > 0);
    }).length;

    const avgRetention = activeStudentIds.length > 0 
        ? Math.round((retainedStudentsCount / activeStudentIds.length) * 100) 
        : 0;

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-emerald-500/20 rounded-lg"><DollarSign className="w-5 h-5 text-emerald-400" /></div>
                        <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Revenue</h3>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">${totalRevenue.toLocaleString()}</div>
                    <div className="text-xs text-slate-500 mt-1">From approved enrollments</div>
                </div>
                
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-indigo-500/20 rounded-lg"><Users className="w-5 h-5 text-indigo-400" /></div>
                        <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Active Students</h3>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{activeStudents}</div>
                    <div className="text-xs text-slate-500 mt-1">Enrolled & verified</div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-purple-500/20 rounded-lg"><BookOpen className="w-5 h-5 text-purple-400" /></div>
                        <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Course Analytics</h3>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{courses.length} Active Courses</div>
                    <div className="text-xs text-slate-500 mt-1">{totalModulesCount} Total Modules Published</div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-amber-500/20 rounded-lg"><TrendingUp className="w-5 h-5 text-amber-400" /></div>
                        <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Avg. Retention</h3>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{avgRetention}%</div>
                    <div className="text-xs text-slate-500 mt-1">Active course participation</div>
                </div>
            </div>
        </div>
    );
};
