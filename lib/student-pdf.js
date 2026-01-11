const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const Mustache = require('mustache');
const prisma = require('./client');

const studentReportHtmlTemplate = fs.readFileSync(
  path.join(__dirname, 'templates', 'student-report.html'),
  'utf8',
);

const SCHOOL_NAME = 'EduAI High School';

const formatDate = (value) =>
  new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(value);

const formatDateTime = (value) =>
  new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);

const parseDecimal = (value) => {
  if (typeof value === 'number') {
    return value;
  }
  if (value && typeof value === 'object' && 'toNumber' in value) {
    return value.toNumber();
  }
  return Number(value);
};

const mapClassCoursesBySubject = (classCourses) =>
  classCourses.reduce((acc, course) => {
    if (!course.subject) {
      return acc;
    }
    const teacherName = course.teacher?.user
      ? `${course.teacher.user.firstName} ${course.teacher.user.lastName}`
      : 'Profesor nealocat';
    acc[course.subject.id] = teacherName;
    return acc;
  }, {});

const buildGradeEntries = (grades, subjectTeachers) => {
  const gradeMap = grades.reduce((acc, grade) => {
    if (!grade.subject) {
      return acc;
    }
    const subjectId = grade.subject.id;
    if (!acc[subjectId]) {
      acc[subjectId] = {
        subjectName: grade.subject.name,
        teacherName: subjectTeachers[subjectId] || 'Profesor nealocat',
        grades: [],
      };
    }
    acc[subjectId].grades.push(parseDecimal(grade.gradeValue));
    return acc;
  }, {});

  return Object.values(gradeMap).map((entry) => {
    const { grades: gradeList } = entry;
    const average =
      gradeList.length > 0
        ? (
            gradeList.reduce((sum, grade) => sum + grade, 0) / gradeList.length
          ).toFixed(2)
        : 'N/A';
    return {
      ...entry,
      gradeList,
      average,
    };
  });
};

const buildAbsenceEntries = (absences) => {
  const absenceMap = absences.reduce((acc, absence) => {
    if (!absence.subject) {
      return acc;
    }
    const subjectId = absence.subject.id;
    if (!acc[subjectId]) {
      acc[subjectId] = {
        subjectName: absence.subject.name,
        dates: [],
      };
    }
    acc[subjectId].dates.push(new Date(absence.absenceDate));
    return acc;
  }, {});

  return Object.values(absenceMap).map((entry) => {
    const sortedDates = entry.dates.sort((a, b) => b.getTime() - a.getTime());
    return {
      subjectName: entry.subjectName,
      count: entry.dates.length,
      dates: sortedDates.map((date) => formatDate(date)),
      lastDate: sortedDates[0] ? formatDate(sortedDates[0]) : 'N/A',
    };
  });
};

const buildReportView = (student, gradeEntries, absenceEntries, overallAverage) => {
  const classLabel = student.class
    ? `${student.class.name} (${student.class.gradeLevel?.name || 'Nivel necunoscut'})`
    : 'Nealocat';
  const homeroomTeacher = student.class?.homeroomTeacher?.user
    ? `${student.class.homeroomTeacher.user.firstName} ${student.class.homeroomTeacher.user.lastName}`
    : 'Neatribuit';

  return {
    schoolName: SCHOOL_NAME,
    generatedAt: formatDateTime(new Date()),
    overallAverage,
    studentName: `${student.user.firstName} ${student.user.lastName}`,
    className: classLabel,
    homeroomTeacher,
    grades: gradeEntries.map((entry) => ({
      subjectName: entry.subjectName,
      teacherName: entry.teacherName,
      gradeList: entry.gradeList.length ? entry.gradeList.join(', ') : 'Nicio notă',
      average: entry.average,
    })),
    absences: absenceEntries.map((entry) => ({
      subjectName: entry.subjectName,
      count: entry.count,
      lastDate: entry.lastDate,
    })),
  };
};

const renderStudentReportHtml = (view) =>
  Mustache.render(studentReportHtmlTemplate, view);

const generatePdfFromHtml = async (html) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    
    // Set content and wait for fonts to load
    await page.setContent(html, { waitUntil: 'load' });
    
    // Wait for fonts to be loaded (Google Fonts)
    await page.evaluate(() => document.fonts.ready);
    
    // Additional wait to ensure rendering is complete
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
    });

    return pdf;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('PDF generation error:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

const exportStudentReport = async (req, res) => {
  try {
    const studentId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(studentId)) {
      return res.status(400).json({ error: 'Invalid student id' });
    }

    const student = await prisma.student.findUnique({
      where: { userId: studentId },
      include: {
        user: true,
        class: {
          include: {
            gradeLevel: true,
            homeroomTeacher: {
              include: { user: true },
            },
          },
        },
        grades: {
          include: { subject: true },
        },
        absences: {
          include: { subject: true },
        },
      },
    });

    if (!student || !student.user) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const classCourses = student.class
      ? await prisma.classCourse.findMany({
          where: { classId: student.class.id },
          include: {
            subject: true,
            teacher: {
              include: { user: true },
            },
          },
        })
      : [];

    const subjectTeachers = mapClassCoursesBySubject(classCourses);
    const gradeEntries = buildGradeEntries(student.grades, subjectTeachers);
    const totalGradeValues = student.grades
      .map((grade) => parseDecimal(grade.gradeValue))
      .filter((value) => Number.isFinite(value));

    const overallAverage =
      totalGradeValues.length > 0
        ? (
            totalGradeValues.reduce((sum, value) => sum + value, 0) /
            totalGradeValues.length
          ).toFixed(2)
        : 'N/A';

    const absenceEntries = buildAbsenceEntries(student.absences);

    const view = buildReportView(student, gradeEntries, absenceEntries, overallAverage);
    const html = renderStudentReportHtml(view);

    // Expose HTML preview if needed in future features
    req.reportHtml = html;

    // Generate PDF from HTML
    // eslint-disable-next-line no-console
    console.log('Generating PDF for student:', view.studentName);
    const pdfBuffer = await generatePdfFromHtml(html);

    if (!pdfBuffer || pdfBuffer.length === 0) {
      // eslint-disable-next-line no-console
      console.error('PDF buffer is empty');
      return res.status(500).json({ error: 'Failed to generate PDF - empty buffer' });
    }

    // eslint-disable-next-line no-console
    console.log(`PDF generated successfully, size: ${pdfBuffer.length} bytes`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=student-report-${view.studentName.replace(/\s+/g, '-')}.pdf`,
    );
    res.setHeader('Content-Length', pdfBuffer.length);

    res.end(pdfBuffer);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Export student report error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to generate student report' });
    }
  }
};

module.exports = {
  exportStudentReport,
  renderStudentReportHtml,
};
