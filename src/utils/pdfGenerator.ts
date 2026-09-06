import { jsPDF } from 'jspdf';
import {
  PatientProfile,
  PhysicianCaseSummary,
  PhysicianRecommendation,
  Language,
} from '../types';

export function downloadCaseSummaryPdf(
  patient: PatientProfile,
  summary: PhysicianCaseSummary | null,
  recommendation: PhysicianRecommendation | null,
  language: Language = 'en'
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      drawHeaderFooter(false);
    }
  };

  const drawHeaderFooter = (isFirstPage: boolean) => {
    // Top border line
    doc.setDrawColor(13, 148, 136); // Teal-600
    doc.setLineWidth(1);
    doc.line(margin, y - 2, pageWidth - margin, y - 2);

    // Footer
    const footerText = 'AAROGYA — Pre-Consultation Case-Taking & Clinical Summary • Strictly Confidential';
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(footerText, margin, pageHeight - 8);
    const pageNum = `Page ${doc.getNumberOfPages()}`;
    doc.text(pageNum, pageWidth - margin - doc.getTextWidth(pageNum), pageHeight - 8);
  };

  // Header Banner
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('AAROGYA — CLINICAL CASE SUMMARY & CARE PLAN', margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(153, 246, 228); // Teal-200
  const deptText = patient.department === 'ayurveda'
    ? 'Department of Ayurveda & Integrative Medicine (कायचिकित्सा)'
    : patient.department
    ? `Department: ${patient.department.toUpperCase()}`
    : 'Clinical Outpatient Department (OPD)';
  doc.text(deptText, margin + 6, y + 15);

  const dateStr = `Generated: ${new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })} • Case ID: ${patient.id || summary?.id || 'N/A'}`;
  doc.setTextColor(203, 213, 225);
  doc.text(dateStr, margin + 6, y + 20);

  y += 28;

  // Patient Demographics Box
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('PATIENT IDENTIFICATION & DEMOGRAPHICS', margin + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const col1 = margin + 4;
  const col2 = margin + 55;
  const col3 = margin + 115;

  doc.text(`Name: ${patient.name || 'N/A'}`, col1, y + 11);
  doc.text(`Age/Sex: ${patient.age || 'N/A'} Yrs / ${patient.sex || 'N/A'}`, col1, y + 17);

  doc.text(`Health ID: ${patient.id || 'N/A'}`, col2, y + 11);
  doc.text(`ABHA ID: ${patient.abhaId || 'N/A'}`, col2, y + 17);

  doc.text(`Phone: ${patient.phone || 'N/A'}`, col3, y + 11);
  doc.text(`Status: Verified Case Record`, col3, y + 17);

  y += 26;

  const renderSection = (title: string, content: string | string[], isHighlight = false) => {
    const textArray = Array.isArray(content)
      ? content.filter(Boolean)
      : [content];
    if (textArray.length === 0) return;

    checkPageBreak(18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    if (isHighlight) {
      doc.setTextColor(13, 148, 136); // Teal-600
    } else {
      doc.setTextColor(15, 23, 42);
    }
    doc.text(title.toUpperCase(), margin, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);

    for (const item of textArray) {
      const splitText = doc.splitTextToSize(item, contentWidth - 4);
      checkPageBreak(splitText.length * 4 + 2);
      doc.text(splitText, margin + 2, y);
      y += splitText.length * 4 + 1;
    }
    y += 2;
  };

  const sections = summary?.summaryEnglish;

  // 1. Chief Complaint
  const chief = sections?.chiefComplaint || patient.primaryConcern || 'Clinical consultation intake';
  renderSection('Chief Complaint & Symptoms', chief, true);

  // 2. History of Present Illness (HPI)
  if (sections?.hpi) {
    renderSection('History of Present Illness (HPI)', sections.hpi);
  }

  // 3. Past Medical & Surgical History
  if (sections?.pastMedicalHistory) {
    renderSection('Past Medical History', sections.pastMedicalHistory);
  }
  if (sections?.pastSurgicalHistory) {
    renderSection('Past Surgical History', sections.pastSurgicalHistory);
  }

  // 4. Current Medications & Allergies
  if (sections?.medicationHistory) {
    renderSection('Medication History', sections.medicationHistory);
  }
  if (sections?.allergies) {
    renderSection('Allergies', sections.allergies);
  }

  // 5. Family & Social History
  if (sections?.familyHistory) {
    renderSection('Family History', sections.familyHistory);
  }
  if (sections?.socialLifestyle) {
    renderSection('Social & Lifestyle History', sections.socialLifestyle);
  }

  // 6. AYUSH / Ayurveda Clinical History if available
  if (summary?.ayushHistory) {
    const ayush = summary.ayushHistory;
    const ayushDetails: string[] = [];

    if (ayush.agni) {
      ayushDetails.push(
        `• Agni (Digestive Fire): Appetite: ${ayush.agni.appetite || 'N/A'}; Digestion: ${ayush.agni.digestion || 'N/A'}; Heaviness/Bloating: ${ayush.agni.bloatingHeaviness || 'N/A'}`
      );
    }
    if (ayush.ahara) {
      ayushDetails.push(
        `• Ahara (Diet): Usual Diet: ${ayush.ahara.usualDiet || 'N/A'}; Food Preferences: ${ayush.ahara.foodPreferences || 'N/A'}; Meal Timings: ${ayush.ahara.mealTimings || 'N/A'}`
      );
    }
    if (ayush.vihara) {
      ayushDetails.push(
        `• Vihara (Lifestyle & Routine): Daily Routine: ${ayush.vihara.dailyRoutine || 'N/A'}; Physical Activity: ${ayush.vihara.physicalActivity || 'N/A'}; Stress Factors: ${ayush.vihara.stressFactors || 'N/A'}`
      );
    }
    if (ayush.nidra) {
      ayushDetails.push(
        `• Nidra (Sleep): Duration: ${ayush.nidra.duration || 'N/A'}; Quality: ${ayush.nidra.quality || 'N/A'}; Disturbances: ${ayush.nidra.disturbances || 'N/A'}`
      );
    }
    if (ayush.mala) {
      ayushDetails.push(
        `• Mala (Elimination): Bowel Frequency: ${ayush.mala.bowelFrequency || 'N/A'}; Consistency: ${ayush.mala.constipationOrLoose || 'N/A'}`
      );
    }
    if (ayush.prakritiObservations) {
      ayushDetails.push(`• Prakriti Observations: ${ayush.prakritiObservations}`);
    }

    if (ayushDetails.length > 0) {
      renderSection('Ayurvedic & Holistic Health Assessment', ayushDetails);
    }
  }

  // 7. Physician Recommendations & Prescription
  if (recommendation) {
    checkPageBreak(35);
    doc.setFillColor(240, 253, 250); // Teal-50
    doc.setDrawColor(13, 148, 136); // Teal-600
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'FD');

    doc.setTextColor(15, 118, 110);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('PHYSICIAN RECOMMENDATION & TREATMENT PLAN (Rx)', margin + 4, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);

    const medName = recommendation.medication || recommendation.recommendationText || 'Prescribed formulation';
    doc.text(`Medicine / Formulation: ${medName}`, margin + 4, y + 12);

    const reg = `Dosage: ${recommendation.dosage || 'As directed'} | Frequency: ${recommendation.frequency || 'As advised'} | Duration: ${recommendation.duration || 'Course duration'}`;
    doc.text(reg, margin + 4, y + 17);

    if (recommendation.diagnosis) {
      doc.text(`Clinical Impression / Diagnosis: ${recommendation.diagnosis}`, margin + 4, y + 22);
    }

    const instructions = recommendation.instructions || recommendation.advice || 'Follow prescription regimen strictly.';
    doc.text(`Instructions: ${instructions}`, margin + 4, y + 27);

    const dietLife = `Diet (Ahara): ${recommendation.dietaryAdvice || 'Light fresh meals'} | Lifestyle (Vihara): ${recommendation.lifestyleAdvice || 'Adequate rest'}`;
    const splitDiet = doc.splitTextToSize(dietLife, contentWidth - 8);
    doc.text(splitDiet, margin + 4, y + 32);

    y += 42;
  }

  // Physician Sign-off Box
  checkPageBreak(25);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'This pre-consultation summary was prepared using AAROGYA clinical case-taking assistant.',
    margin,
    y
  );

  const doctorName = recommendation?.doctorName;
  if (doctorName) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    const signText = `Verified & Confirmed by: ${doctorName}`;
    doc.text(signText, pageWidth - margin - doc.getTextWidth(signText), y);
  }

  drawHeaderFooter(true);

  // Save the PDF
  const safeId = (patient.id || 'Summary').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`AAROGYA_Case_${safeId}.pdf`);
}
