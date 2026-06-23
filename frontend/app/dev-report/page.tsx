"use client";

import ReactMarkdown from "react-markdown";

const sampleReport = `
# Premium Vedic Astrology Report

## 1. Core Personality & Life Pattern

You mentioned that you are currently unemployed. Your chart and current timing show delays and instability around career matters.

## 2. Moon Sign, Nakshatra and Pada Analysis

Moon Sign: Cancer  
Nakshatra: Pushya  
Pada: 2  
Nakshatra Lord: Saturn

## 5. Core Karmic Challenges

Repeating life struggles include instability in career and emotional avoidance.

## 6. Career, Work & Success Path

Suitable directions include project coordination, education, social services, compliance, HR, or small-business operations.

## 18. Direct Answer to Your Question

### Your Question

I am unemployed with frequent job changes and gaps. How can I find the right career path?

### Brief Answer

Stability is possible, but it needs one clear direction and consistent effort.

### What the Chart Indicates

Ketu Mahadasha shows detachment and repeated restarts.

### Possible Time Period

Short-term improvement may come through practical work and skill-building.

### Practical Advice

- Choose one skill.
- Apply daily.
- Avoid changing direction every few weeks.

## Final Observation

The chart shows improvement through discipline, not sudden luck.
`;

export default function DevReportPage() {
  return (
    <main className="report-preview">
      <ReactMarkdown>{sampleReport}</ReactMarkdown>
    </main>
  );
}