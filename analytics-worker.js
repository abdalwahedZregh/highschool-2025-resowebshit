// analytics-worker.js
self.onmessage = function(e) {
    const studentsData = e.data;
    const analyticsResult = preCacheSubjectAnalytics(studentsData);
    self.postMessage(analyticsResult);
};

function preCacheSubjectAnalytics(studentsData) {
    const subjectMap = {};
    
    studentsData.forEach(student => {
        student.grades.forEach(grade => {
            const [scoreStr, maxScoreStr] = grade.total.split('/').map(s => parseFloat(s.trim()));
            const percentage = (scoreStr / maxScoreStr) * 100;
            
            const subjectKey = `${grade.subject}_${student.stream}`;
            if (!subjectMap[subjectKey]) {
                subjectMap[subjectKey] = {
                    subjectName: grade.subject,
                    stream: student.stream,
                    scores: [],
                    maxScores: [],
                    percentages: [],
                    gradeDistribution: {
                        '50-59': 0,
                        '60-69': 0,
                        '70-79': 0,
                        '80-89': 0,
                        '90-100': 0
                    }
                };
            }
            
            const subjectData = subjectMap[subjectKey];
            subjectData.scores.push(scoreStr);
            subjectData.maxScores.push(maxScoreStr);
            subjectData.percentages.push(percentage);
            
            if (percentage >= 50) {
                if (percentage >= 90) {
                    subjectData.gradeDistribution['90-100']++;
                } else if (percentage >= 80) {
                    subjectData.gradeDistribution['80-89']++;
                } else if (percentage >= 70) {
                    subjectData.gradeDistribution['70-79']++;
                } else if (percentage >= 60) {
                    subjectData.gradeDistribution['60-69']++;
                } else {
                    subjectData.gradeDistribution['50-59']++;
                }
            }
        });
    });
    
    const subjectAnalyticsCache = {};
    Object.values(subjectMap).forEach(subject => {
        const averagePercentage = subject.percentages.reduce((a, b) => a + b, 0) / subject.percentages.length;
        const passCount = subject.percentages.filter(p => p >= 50).length;
        const failCount = subject.percentages.length - passCount;
        const sortedScores = [...subject.scores].sort((a, b) => a - b);
        const mid = Math.floor(sortedScores.length / 2);
        const medianScore = sortedScores.length % 2 !== 0 ? 
            sortedScores[mid] : 
            (sortedScores[mid - 1] + sortedScores[mid]) / 2;
        const highestScore = Math.max(...subject.scores);
        const lowestScore = Math.min(...subject.scores);
        
        subjectAnalyticsCache[`${subject.subjectName}_${subject.stream}`] = {
            subjectName: subject.subjectName,
            stream: subject.stream,
            averagePercentage: parseFloat(averagePercentage.toFixed(1)),
            passCount: passCount,
            failCount: failCount,
            medianScore: medianScore,
            highestScore: highestScore,
            lowestScore: lowestScore,
            gradeDistribution: subject.gradeDistribution
        };
    });
    
    const streamSummaries = {
        "علمي": { totalStudents: 0, passingStudents: 0, failingStudents: 0, gradeDistribution: {} },
        "أدبي": { totalStudents: 0, passingStudents: 0, failingStudents: 0, gradeDistribution: {} }
    };
    
    Object.keys(streamSummaries).forEach(stream => {
        streamSummaries[stream].gradeDistribution = {
            "ممتاز": 0,
            "جيد جداً": 0,
            "جيد": 0,
            "مقبول": 0,
            "ضعيف": 0
        };
    });
    
    studentsData.forEach(student => {
        const stream = student.stream;
        streamSummaries[stream].totalStudents++;
        
        const hasFailure = student.grades.some(grade => {
            const [scoreStr, maxScoreStr] = grade.total.split('/').map(s => parseFloat(s.trim()));
            const percentage = (scoreStr / maxScoreStr) * 100;
            return percentage < 50;
        });
        
        if (hasFailure) {
            streamSummaries[stream].failingStudents++;
        } else {
            streamSummaries[stream].passingStudents++;
        }
        
        const totalScore = student.grades.reduce((sum, g) => {
            const [scoreStr] = g.total.split('/').map(s => parseFloat(s.trim()));
            return sum + scoreStr;
        }, 0);
        
        const maxScore = student.grades.reduce((sum, g) => {
            const [, maxScoreStr] = g.total.split('/').map(s => parseFloat(s.trim()));
            return sum + maxScoreStr;
        }, 0);
        
        const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
        
        if (percentage >= 85) {
            streamSummaries[stream].gradeDistribution["ممتاز"]++;
        } else if (percentage >= 75) {
            streamSummaries[stream].gradeDistribution["جيد جداً"]++;
        } else if (percentage >= 65) {
            streamSummaries[stream].gradeDistribution["جيد"]++;
        } else if (percentage >= 50) {
            streamSummaries[stream].gradeDistribution["مقبول"]++;
        } else {
            streamSummaries[stream].gradeDistribution["ضعيف"]++;
        }
    });
    
    return {
        subjectAnalyticsCache: subjectAnalyticsCache,
        streamSummaries: streamSummaries
    };
}