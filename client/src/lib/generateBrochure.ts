import jsPDF from 'jspdf';
import 'jspdf-autotable';
import sdpLogoUrl from '@assets/SDP_Global_Pay_Logo.png';
import whoWeHelpImage from '@assets/image_1759706979941.png';

function loadImage(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      } catch (e) {
        reject(e);
      }
    };
    
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

export async function generateSDPBrochure() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Colors from SDP branding - Using Orange theme
  const primaryOrange = [255, 127, 39];    // #FF7F27 - Main brand color
  const darkOrange = [230, 100, 20];       // Darker orange for accents
  const darkGray = [51, 51, 51];           // #333333
  const lightGray = [128, 128, 128];       // #808080
  const white = [255, 255, 255];

  // Page dimensions
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;

  // Load images as base64 data URLs for reliable PDF rendering
  let logoImgData: string | null = null;
  let workflowImgData: string | null = null;
  
  try {
    logoImgData = await loadImage(sdpLogoUrl);
  } catch (e) {
    console.warn('Failed to load logo image:', e);
  }

  try {
    workflowImgData = await loadImage(whoWeHelpImage);
  } catch (e) {
    console.warn('Failed to load workflow image:', e);
  }

  // ===== HEADER SECTION =====
  // White header background (removed blue stripes)
  doc.setFillColor(white[0], white[1], white[2]);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Add SDP Logo (actual image)
  if (logoImgData) {
    try {
      doc.addImage(logoImgData, 'PNG', pageWidth / 2 - 25, 8, 50, 12, undefined, 'FAST');
    } catch (e) {
      console.warn('Failed to add logo to PDF:', e);
      doc.setTextColor(primaryOrange[0], primaryOrange[1], primaryOrange[2]);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('SDP Global Pay', pageWidth / 2, 15, { align: 'center' });
    }
  } else {
    doc.setTextColor(primaryOrange[0], primaryOrange[1], primaryOrange[2]);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('SDP Global Pay', pageWidth / 2, 15, { align: 'center' });
  }

  // Tagline
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Trusted by 10,000+ businesses across 17 countries', pageWidth / 2, 45, { align: 'center' });

  // ===== HERO SECTION =====
  let yPos = 60;
  
  // Main headline
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('We Make Global Contracting', pageWidth / 2, yPos, { align: 'center' });
  yPos += 7;
  doc.text('and Employment Easy', pageWidth / 2, yPos, { align: 'center' });

  // About text
  yPos += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const aboutText = 'For over twenty years, we\'ve delighted businesses, agencies, and contractors by offering easy contracting and employment solutions. Our happy team, spread across five continents, delivers service with a smile.';
  const splitAbout = doc.splitTextToSize(aboutText, pageWidth - 2 * margin);
  doc.text(splitAbout, pageWidth / 2, yPos, { align: 'center' });

  // ===== WHO WE HELP SECTION =====
  yPos += 18;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryOrange[0], primaryOrange[1], primaryOrange[2]);
  doc.text('Who We Help', pageWidth / 2, yPos, { align: 'center' });

  yPos += 8;
  
  // Add the workflow image showing freelancer, recruiter, and business
  if (workflowImgData) {
    try {
      // Add the "connecting contractors, recruiters and businesses worldwide" image
      const imgWidth = 140;
      const imgHeight = 50;
      doc.addImage(workflowImgData, 'PNG', (pageWidth - imgWidth) / 2, yPos, imgWidth, imgHeight, undefined, 'FAST');
      yPos += imgHeight + 5;
    } catch (e) {
      console.warn('Failed to add workflow image to PDF:', e);
      // Fallback to text boxes
      yPos = addWhoWeHelpBoxes(doc, yPos, primaryOrange, darkGray, pageWidth);
    }
  } else {
    // Fallback to text boxes if image fails
    yPos = addWhoWeHelpBoxes(doc, yPos, primaryOrange, darkGray, pageWidth);
  }

  // Add subtitle for the image
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.text('Connecting contractors, recruiters and businesses worldwide', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  // ===== KEY FEATURES SECTION =====
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryOrange[0], primaryOrange[1], primaryOrange[2]);
  doc.text('Why Choose SDP Global Pay?', pageWidth / 2, yPos, { align: 'center' });

  yPos += 8;
  const features = [
    { icon: '✅', title: '100% Compliant', desc: 'Full employment law compliance across all 17 countries' },
    { icon: '🌍', title: 'Global Scale', desc: 'Unified processes across 17 countries with local banking' },
    { icon: '⭐', title: 'Expert Support', desc: 'Dedicated support team across five continents' },
    { icon: '⚡', title: 'Fast Setup', desc: 'Get started in as little as 24 hours' },
    { icon: '💰', title: 'Bang for Your Buck', desc: 'No setup fees, no minimum deposits, cancel anytime' },
    { icon: '❤️', title: 'Happy Workers', desc: 'People-first approach ensures satisfaction for all' }
  ];

  const featureBoxWidth = 38;
  const featureBoxHeight = 20;
  const featureBoxSpacing = 3;
  const featureStartX = (pageWidth - (3 * featureBoxWidth + 2 * featureBoxSpacing)) / 2;

  features.forEach((feature, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const x = featureStartX + (featureBoxWidth + featureBoxSpacing) * col;
    const y = yPos + (featureBoxHeight + featureBoxSpacing) * row;
    
    // Box with orange border
    doc.setDrawColor(primaryOrange[0], primaryOrange[1], primaryOrange[2]);
    doc.setLineWidth(0.3);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, featureBoxWidth, featureBoxHeight, 2, 2, 'FD');
    
    // Icon
    doc.setFontSize(12);
    doc.text(feature.icon, x + featureBoxWidth / 2, y + 6, { align: 'center' });
    
    // Title
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryOrange[0], primaryOrange[1], primaryOrange[2]);
    doc.text(feature.title, x + featureBoxWidth / 2, y + 11, { align: 'center' });
    
    // Description
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    const splitFeature = doc.splitTextToSize(feature.desc, featureBoxWidth - 3);
    doc.text(splitFeature, x + featureBoxWidth / 2, y + 14.5, { align: 'center' });
  });

  // ===== HOW IT WORKS SECTION =====
  yPos += (featureBoxHeight + featureBoxSpacing) * 2 + 8;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryOrange[0], primaryOrange[1], primaryOrange[2]);
  doc.text('How It Works', pageWidth / 2, yPos, { align: 'center' });

  yPos += 7;
  const steps = [
    { num: '1', title: 'Sign Up', desc: 'Create your business account in minutes' },
    { num: '2', title: 'Add Workers', desc: 'Onboard employees or contractors globally' },
    { num: '3', title: 'Automate', desc: 'Contracts, payroll, and compliance - all done' }
  ];

  const stepWidth = 60;
  const stepStartX = (pageWidth - stepWidth * 3) / 2;

  steps.forEach((step, index) => {
    const x = stepStartX + stepWidth * index;
    
    // Step number circle
    doc.setFillColor(primaryOrange[0], primaryOrange[1], primaryOrange[2]);
    doc.circle(x + stepWidth / 2, yPos + 5, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(step.num, x + stepWidth / 2, yPos + 6.5, { align: 'center' });
    
    // Title
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFontSize(9);
    doc.text(step.title, x + stepWidth / 2, yPos + 13, { align: 'center' });
    
    // Description
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    const splitStep = doc.splitTextToSize(step.desc, stepWidth - 8);
    doc.text(splitStep, x + stepWidth / 2, yPos + 17, { align: 'center' });
    
    // Arrow between steps
    if (index < steps.length - 1) {
      doc.setDrawColor(primaryOrange[0], primaryOrange[1], primaryOrange[2]);
      doc.setLineWidth(0.5);
      doc.line(x + stepWidth - 5, yPos + 5, x + stepWidth + 5, yPos + 5);
      // Arrow head
      doc.line(x + stepWidth + 5, yPos + 5, x + stepWidth + 3, yPos + 3.5);
      doc.line(x + stepWidth + 5, yPos + 5, x + stepWidth + 3, yPos + 6.5);
    }
  });

  // ===== COUNTRIES SECTION =====
  yPos += 25;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryOrange[0], primaryOrange[1], primaryOrange[2]);
  doc.text('Countries We Serve', pageWidth / 2, yPos, { align: 'center' });

  yPos += 6;
  const countries = [
    'Australia', 'USA', 'New Zealand', 'Ireland', 'Philippines', 'Japan',
    'Canada', 'United Kingdom', 'Romania', 'Singapore', 'Malaysia', 'Vietnam',
    'India', 'Brazil', 'Pakistan', 'Sri Lanka', 'Germany'
  ];

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  
  // Display countries in a compact grid format
  const countriesPerRow = 6;
  const countryBoxWidth = 28;
  const countryBoxHeight = 5;
  const countrySpacing = 2;
  const countryStartX = (pageWidth - (countriesPerRow * countryBoxWidth + (countriesPerRow - 1) * countrySpacing)) / 2;

  countries.forEach((country, index) => {
    const row = Math.floor(index / countriesPerRow);
    const col = index % countriesPerRow;
    const x = countryStartX + (countryBoxWidth + countrySpacing) * col;
    const y = yPos + (countryBoxHeight + 1) * row;
    
    // Orange accent marker
    doc.setFillColor(primaryOrange[0], primaryOrange[1], primaryOrange[2]);
    doc.circle(x + 2, y + 2.5, 0.8, 'F');
    
    // Country name
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(country, x + 4.5, y + 3.2);
  });

  // ===== STATS SECTION =====
  yPos += Math.ceil(countries.length / countriesPerRow) * 6 + 8;
  doc.setFillColor(255, 245, 235); // Light orange background
  doc.rect(margin, yPos, pageWidth - 2 * margin, 18, 'F');
  
  yPos += 6;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryOrange[0], primaryOrange[1], primaryOrange[2]);
  doc.text('Trusted by Thousands', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text('$2 Billion+ in Payments  •  100,000+ Contracts  •  17 Countries  •  20+ Years Experience', pageWidth / 2, yPos, { align: 'center' });

  // ===== FOOTER SECTION =====
  yPos += 10;
  doc.setFillColor(primaryOrange[0], primaryOrange[1], primaryOrange[2]);
  doc.rect(0, yPos, pageWidth, 25, 'F');

  yPos += 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Contact Our Regional Teams', pageWidth / 2, yPos, { align: 'center' });

  yPos += 6;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');

  // Contact info in three columns
  const contactY = yPos;
  // Americas
  doc.text('Americas', 35, contactY);
  doc.text('+1 (650) 924-9250', 35, contactY + 3.5);
  doc.text('americas@sdpglobalpay.com', 35, contactY + 7);

  // Europe
  doc.text('Europe', pageWidth / 2, contactY, { align: 'center' });
  doc.text('+44 (20) 8144 9229', pageWidth / 2, contactY + 3.5, { align: 'center' });
  doc.text('europe@sdpglobalpay.com', pageWidth / 2, contactY + 7, { align: 'center' });

  // Asia Pacific
  doc.text('Asia Pacific', 175, contactY, { align: 'right' });
  doc.text('+61 (2) 9233 2255', 175, contactY + 3.5, { align: 'right' });
  doc.text('apac@sdpglobalpay.com', 175, contactY + 7, { align: 'right' });

  // Bottom tagline
  yPos += 13;
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('www.sdpglobalpay.com  •  No setup fees  •  14-day free trial  •  Cancel anytime', pageWidth / 2, yPos, { align: 'center' });

  // ===== PAGE 2: COUNTRY GUIDES =====
  doc.addPage();
  yPos = margin;

  // Header with logo
  doc.setFillColor(white[0], white[1], white[2]);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  if (logoImgData) {
    try {
      doc.addImage(logoImgData, 'PNG', margin, 8, 40, 10, undefined, 'FAST');
    } catch (e) {
      doc.setTextColor(primaryOrange[0], primaryOrange[1], primaryOrange[2]);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('SDP Global Pay', margin, 15);
    }
  }

  doc.setTextColor(primaryOrange[0], primaryOrange[1], primaryOrange[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Country Employment Guides', pageWidth / 2, 25, { align: 'center' });

  yPos = 40;

  // Country guide data in compact format
  const countryGuides = [
    { flag: '🇦🇺', name: 'Australia', minWage: 'A$23.23/hr', hours: '38 hrs/wk', leave: '4 wks annual', tax: '11.5% super' },
    { flag: '🇺🇸', name: 'USA', minWage: '$7.25/hr federal', hours: '40 hrs/wk', leave: 'No federal min', tax: '7.65% payroll' },
    { flag: '🇳🇿', name: 'New Zealand', minWage: 'NZ$22.70/hr', hours: '40 hrs/wk', leave: '4 wks annual', tax: '3% KiwiSaver' },
    { flag: '🇮🇪', name: 'Ireland', minWage: '€11.30/hr', hours: '39 hrs/wk', leave: '4 wks annual', tax: '11.05% PRSI' },
    { flag: '🇵🇭', name: 'Philippines', minWage: '₱537-610/day', hours: '48 hrs/wk', leave: '5 days SIL', tax: '13th month pay' },
    { flag: '🇯🇵', name: 'Japan', minWage: '¥901/hr avg', hours: '40 hrs/wk', leave: '10+ days', tax: 'Health insurance' },
    { flag: '🇨🇦', name: 'Canada', minWage: 'C$15-16.77/hr', hours: '40-48 hrs/wk', leave: '2-3 wks', tax: 'CPP + EI' },
    { flag: '🇬🇧', name: 'UK', minWage: '£10.42/hr', hours: '48 hrs max', leave: '28 days', tax: 'NI 13.8%' },
  ];

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  
  // Display in two columns
  const colWidth = (pageWidth - 3 * margin) / 2;
  const rowHeight = 18;
  
  countryGuides.forEach((country, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = margin + col * (colWidth + margin);
    const y = yPos + row * rowHeight;
    
    // Country box
    doc.setFillColor(250, 250, 252);
    doc.setDrawColor(primaryOrange[0], primaryOrange[1], primaryOrange[2]);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, colWidth, rowHeight - 2, 1.5, 1.5, 'FD');
    
    // Flag and country name
    doc.setFontSize(11);
    doc.text(country.flag, x + 3, y + 6);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(country.name, x + 10, y + 6);
    
    // Details in smaller text
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.text(`Min Wage: ${country.minWage}`, x + 3, y + 10);
    doc.text(`Hours: ${country.hours}`, x + 3, y + 13);
    
    doc.text(`Leave: ${country.leave}`, x + colWidth / 2 + 2, y + 10);
    doc.text(`Tax: ${country.tax}`, x + colWidth / 2 + 2, y + 13);
  });

  // Key compliance points section
  yPos = yPos + Math.ceil(countryGuides.length / 2) * rowHeight + 5;
  
  doc.setFillColor(primaryOrange[0], primaryOrange[1], primaryOrange[2]);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 6, 'F');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Key Compliance Considerations', pageWidth / 2, yPos + 4, { align: 'center' });
  
  yPos += 9;
  
  const compliancePoints = [
    '✓ Employment Contracts: Written agreements required in most jurisdictions',
    '✓ Payroll & Tax: Local tax withholding and social security contributions mandatory',
    '✓ Leave Entitlements: Annual leave, sick leave, and public holidays vary by country',
    '✓ Termination Rules: Notice periods and severance requirements differ significantly',
    '✓ Work Permits: Ensure proper work authorization for international workers',
    '✓ Data Protection: GDPR (EU/UK) and local privacy laws must be followed',
  ];
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  
  compliancePoints.forEach((point, index) => {
    const row = Math.floor(index / 2);
    const col = index % 2;
    const x = margin + 5 + col * (pageWidth - 2 * margin) / 2;
    const y = yPos + row * 5;
    doc.text(point, x, y);
  });
  
  // Footer with call to action
  yPos = pageHeight - 30;
  doc.setFillColor(245, 245, 250);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 20, 'F');
  
  yPos += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryOrange[0], primaryOrange[1], primaryOrange[2]);
  doc.text('Need Help with Global Employment?', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 5;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text('Contact us for a free consultation on hiring in any of our 17 supported countries', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryOrange[0], primaryOrange[1], primaryOrange[2]);
  doc.text('📧 hello@sdpglobalpay.com  •  📞 +61 (2) 9233 2255', pageWidth / 2, yPos, { align: 'center' });

  // Download the PDF
  doc.save('SDP-Global-Pay-Services-Brochure.pdf');
}

function addWhoWeHelpBoxes(doc: jsPDF, yPos: number, primaryOrange: number[], darkGray: number[], pageWidth: number): number {
  const whoWeHelp = [
    {
      icon: '👔',
      title: 'Contractors',
      desc: 'We make the whole process of contracting easy. We do the heavy lifting allowing you to focus on what you do best.'
    },
    {
      icon: '👥',
      title: 'Recruiters',
      desc: 'We help recruiters increase their revenue. We manage your back office, so you are free to focus on growing your business.'
    },
    {
      icon: '🏢',
      title: 'Business / Enterprise',
      desc: 'We solve contingent workforce bottlenecks with a global perspective, and execute with local expertise.'
    }
  ];

  const boxWidth = 58;
  const boxHeight = 28;
  const boxSpacing = 4;
  const startX = (pageWidth - (3 * boxWidth + 2 * boxSpacing)) / 2;

  whoWeHelp.forEach((item, index) => {
    const x = startX + (boxWidth + boxSpacing) * index;
    
    // Box
    doc.setFillColor(245, 245, 250);
    doc.roundedRect(x, yPos, boxWidth, boxHeight, 2, 2, 'F');
    
    // Icon
    doc.setFontSize(16);
    doc.text(item.icon, x + boxWidth / 2, yPos + 8, { align: 'center' });
    
    // Title
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryOrange[0], primaryOrange[1], primaryOrange[2]);
    doc.text(item.title, x + boxWidth / 2, yPos + 13, { align: 'center' });
    
    // Description
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    const splitDesc = doc.splitTextToSize(item.desc, boxWidth - 4);
    doc.text(splitDesc, x + boxWidth / 2, yPos + 17, { align: 'center' });
  });

  return yPos + boxHeight + 5;
}
