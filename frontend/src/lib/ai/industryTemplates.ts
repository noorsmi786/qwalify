import type { IndustryTemplate, IndustryType } from '@/types/agent';

export const INDUSTRY_TEMPLATES: Record<IndustryType, IndustryTemplate> = {
  dental: {
    id: 'dental',
    name: 'Dental & Medical Clinic',
    badge: 'Healthcare',
    icon: 'Activity',
    color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    tagline: 'Triage patient dental pain, check insurance, and schedule urgent dentist slots.',
    description:
      'Ideal for dental practices, orthodontists, and medical clinics. Gently triages symptoms, verifies insurance, and books clinic appointments.',
    defaultTone: 'empathetic',
    defaultEmoji: 'subtle',
    sampleGreeting:
      'Hello! 👋 Welcome to Dr. Smile Dental. Are you experiencing any urgent tooth pain, or looking for a routine consultation / cosmetic service?',
    defaultBookingUrl: 'https://calendly.com/dental-clinic/checkup',
    suggestedQuestions: [
      {
        id: 'q_dental_1',
        text: 'What service or symptoms bring you in? (e.g. pain relief, teeth whitening, cleaning, implants)',
        weight: 30,
        required: true,
        idealAnswer: 'Implants, whitening, or routine checkup',
      },
      {
        id: 'q_dental_2',
        text: 'How soon are you looking to be seen? (e.g. today/urgent, this week, flexible)',
        weight: 35,
        required: true,
        idealAnswer: 'This week or urgent',
      },
      {
        id: 'q_dental_3',
        text: 'Do you have dental insurance (PPO/Delta/MetLife) or will you be self-pay?',
        weight: 20,
        required: false,
        idealAnswer: 'PPO insurance or ready for private pay',
      },
      {
        id: 'q_dental_4',
        text: 'Have you been to our clinic before, or is this your first time visiting us?',
        weight: 15,
        required: false,
        idealAnswer: 'New patient',
      },
    ],
    suggestedKnowledge: [
      {
        id: 'k_dental_1',
        category: 'Location & Parking',
        question: 'Where is your clinic located and is there parking?',
        answer: 'We are located at 450 Medical Arts Plaza, Suite 200. Free patient parking is available behind the building.',
      },
      {
        id: 'k_dental_2',
        category: 'Insurance',
        question: 'What insurance plans do you accept?',
        answer: 'We accept Delta Dental, MetLife, Cigna PPO, Guardian, and Aetna. We also offer 0% interest monthly payment plans via CareCredit.',
      },
      {
        id: 'k_dental_3',
        category: 'Emergency',
        question: 'What if I have severe tooth pain after hours?',
        answer: 'For emergency toothaches or broken teeth, our on-call dentist can accommodate same-day emergency triage. Call our direct line if bleeding.',
      },
    ],
  },

  real_estate: {
    id: 'real_estate',
    name: 'Real Estate Brokerage',
    badge: 'Property',
    icon: 'Building2',
    color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    tagline: 'Qualify buyer budget, location preference, and schedule VIP property viewings.',
    description:
      'Built for realtors, brokerages, and property managers. Filters serious buyers from window-shoppers and schedules showings.',
    defaultTone: 'professional',
    defaultEmoji: 'subtle',
    sampleGreeting:
      'Hi there! 🏡 Thanks for reaching out to Skyline Realty. Are you looking to purchase a new home, sell, or explore rental properties?',
    defaultBookingUrl: 'https://calendly.com/realty/showing',
    suggestedQuestions: [
      {
        id: 'q_re_1',
        text: 'What is your target budget range for this property? (e.g. $400k-$600k, $1M+)',
        weight: 35,
        required: true,
        idealAnswer: '$500,000+',
      },
      {
        id: 'q_re_2',
        text: 'Are you looking to buy, rent, or invest?',
        weight: 25,
        required: true,
        idealAnswer: 'Buy or invest',
      },
      {
        id: 'q_re_3',
        text: 'What is your moving timeline? (e.g. within 30 days, 2-3 months, just browsing)',
        weight: 25,
        required: true,
        idealAnswer: 'Within 30-60 days',
      },
      {
        id: 'q_re_4',
        text: 'Have you been pre-approved for a mortgage or planning a cash purchase?',
        weight: 15,
        required: false,
        idealAnswer: 'Pre-approved with letter',
      },
    ],
    suggestedKnowledge: [
      {
        id: 'k_re_1',
        category: 'Areas Covered',
        question: 'What neighborhoods or cities do you cover?',
        answer: 'We specialize in Downtown, Westside suburbs, and luxury waterfront developments across the greater metro area.',
      },
      {
        id: 'k_re_2',
        category: 'Commission',
        question: 'What are your buyer representation fees?',
        answer: 'Buyer representation is completely free to buyers — our commission is covered by the seller at closing.',
      },
      {
        id: 'k_re_3',
        category: 'Viewings',
        question: 'Can we schedule private weekend viewings?',
        answer: 'Yes! We host private walkthroughs 7 days a week between 9 AM and 7 PM with advance booking.',
      },
    ],
  },

  school: {
    id: 'school',
    name: 'Schools & Academies',
    badge: 'Education',
    icon: 'GraduationCap',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    tagline: 'Qualify student grade levels, answer tuition questions, and book campus tours.',
    description:
      'Ideal for private K-12 schools, language academies, coding bootcamps, and tutoring centers. Answers curriculum questions and schedules parent tours.',
    defaultTone: 'friendly',
    defaultEmoji: 'subtle',
    sampleGreeting:
      'Hello! 🎓 Welcome to Apex Academy. Are you inquiring about admissions for your child or adult training courses?',
    defaultBookingUrl: 'https://calendly.com/academy/campus-tour',
    suggestedQuestions: [
      {
        id: 'q_school_1',
        text: 'What grade level or subject area is the student interested in?',
        weight: 30,
        required: true,
        idealAnswer: 'Elementary, Middle, High School, or Specific Course',
      },
      {
        id: 'q_school_2',
        text: 'When are you hoping to start? (e.g. upcoming semester, immediate transfer, summer)',
        weight: 30,
        required: true,
        idealAnswer: 'Next semester or immediate transfer',
      },
      {
        id: 'q_school_3',
        text: 'Would you like to schedule an in-person campus walkthrough or an online info session?',
        weight: 25,
        required: false,
        idealAnswer: 'Campus walkthrough',
      },
      {
        id: 'q_school_4',
        text: 'Do you have questions about financial aid or sibling scholarship discounts?',
        weight: 15,
        required: false,
        idealAnswer: 'Ready to learn more',
      },
    ],
    suggestedKnowledge: [
      {
        id: 'k_school_1',
        category: 'Tuition & Fees',
        question: 'What is the tuition cost and are payment plans available?',
        answer: 'Annual tuition ranges from $8,500 to $14,000 depending on grade level. We offer 10-month zero-interest payment installments.',
      },
      {
        id: 'k_school_2',
        category: 'Accreditation',
        question: 'Is the school accredited and what is class size?',
        answer: 'Yes, fully state-accredited with a 12:1 student-to-teacher ratio for personalized student mentorship.',
      },
    ],
  },

  salon: {
    id: 'salon',
    name: 'Hair Salon & Spa',
    badge: 'Beauty & Wellness',
    icon: 'Sparkles',
    color: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
    tagline: 'Book appointments, suggest styling packages, and confirm preferred stylists.',
    description:
      'Perfect for hair salons, luxury spas, nail bars, and barbershops. Handles service inquiries, pricing menus, and instant slot reservations.',
    defaultTone: 'casual',
    defaultEmoji: 'expressive',
    sampleGreeting:
      'Hey gorgeous! ✨ Welcome to Velvet Hair & Spa Lounge. What service are you pampering yourself with today? (Cut, Balayage, Facial, Spa)',
    defaultBookingUrl: 'https://calendly.com/velvet-salon/book',
    suggestedQuestions: [
      {
        id: 'q_salon_1',
        text: 'What service would you like to book? (e.g. Haircut & Blowout, Full Balayage, Keratin, Facial)',
        weight: 35,
        required: true,
        idealAnswer: 'Color, Balayage, or VIP Package',
      },
      {
        id: 'q_salon_2',
        text: 'What day and time window works best for you? (e.g. this Friday afternoon, weekend morning)',
        weight: 35,
        required: true,
        idealAnswer: 'This week',
      },
      {
        id: 'q_salon_3',
        text: 'Do you have a specific master stylist in mind or first available specialist?',
        weight: 20,
        required: false,
        idealAnswer: 'First available or Senior Stylist',
      },
      {
        id: 'q_salon_4',
        text: 'Is your hair currently color-treated or looking for a full transformation?',
        weight: 10,
        required: false,
        idealAnswer: 'Transformation',
      },
    ],
    suggestedKnowledge: [
      {
        id: 'k_salon_1',
        category: 'Pricing Menu',
        question: 'What are your typical prices for color and cuts?',
        answer: 'Cuts start at $65, Full Balayage & Glaze starts at $220, and 60-min Deep Glow Facials are $110. Free consultation included!',
      },
      {
        id: 'k_salon_2',
        category: 'Cancellation Policy',
        question: 'What is your cancellation policy?',
        answer: 'We request 24 hours advance notice to reschedule without penalty. Same-day deposits apply to large color transformations.',
      },
    ],
  },

  b2b: {
    id: 'b2b',
    name: 'B2B Agency & SaaS',
    badge: 'Enterprise Sales',
    icon: 'Zap',
    color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    tagline: 'Qualify team size, budget, timeline, and schedule 15-min discovery demos.',
    description:
      'Designed for SaaS companies, marketing agencies, consultants, and service providers. Strictly qualifies decision makers and books demos.',
    defaultTone: 'professional',
    defaultEmoji: 'subtle',
    sampleGreeting:
      'Hi there! 👋 Thanks for checking out our growth solutions. What is the primary bottleneck your team is looking to solve this quarter?',
    defaultBookingUrl: 'https://calendly.com/growth-demo/15min',
    suggestedQuestions: [
      {
        id: 'q_b2b_1',
        text: 'What is the main challenge or goal you want to achieve right now?',
        weight: 30,
        required: true,
        idealAnswer: 'Scaling sales pipeline and automation',
      },
      {
        id: 'q_b2b_2',
        text: 'How large is your current team or monthly lead volume?',
        weight: 25,
        required: true,
        idealAnswer: '10+ team members or 500+ leads/mo',
      },
      {
        id: 'q_b2b_3',
        text: 'What is your budget range for implementing this? (e.g. $1k-$3k/mo, $5k+/mo)',
        weight: 30,
        required: true,
        idealAnswer: '$2,500+/mo',
      },
      {
        id: 'q_b2b_4',
        text: 'What is your target rollout timeline? (e.g. immediate, next 30 days, Q3)',
        weight: 15,
        required: false,
        idealAnswer: 'Within 2-4 weeks',
      },
    ],
    suggestedKnowledge: [
      {
        id: 'k_b2b_1',
        category: 'Onboarding & Setup',
        question: 'How long does integration and setup take?',
        answer: 'Most clients are live and receiving automated qualified leads within 48 hours with full white-glove onboarding.',
      },
      {
        id: 'k_b2b_2',
        category: 'Integrations',
        question: 'What CRMs and calendars do you support?',
        answer: 'We integrate with HubSpot, Salesforce, GoHighLevel, Calendly, Cal.com, WhatsApp, and custom webhooks.',
      },
    ],
  },

  auto: {
    id: 'auto',
    name: 'Auto Dealership & Service',
    badge: 'Automotive',
    icon: 'Car',
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    tagline: 'Qualify vehicle models, trade-in value, and schedule test drives & repair slots.',
    description:
      'For car dealerships, auto repair centers, and detailing studios. Qualifies trade-ins, financing readiness, and books test drives.',
    defaultTone: 'direct',
    defaultEmoji: 'subtle',
    sampleGreeting:
      'Hey! 🚗 Welcome to Premier Auto. Are you looking to purchase a new/used vehicle, get a trade-in appraisal, or schedule auto repair?',
    defaultBookingUrl: 'https://calendly.com/premier-auto/test-drive',
    suggestedQuestions: [
      {
        id: 'q_auto_1',
        text: 'What specific vehicle model or service are you interested in?',
        weight: 35,
        required: true,
        idealAnswer: 'SUV / Sedan or Major Service',
      },
      {
        id: 'q_auto_2',
        text: 'Do you have a vehicle you would like to trade in for cash value?',
        weight: 25,
        required: false,
        idealAnswer: 'Yes, looking for appraisal',
      },
      {
        id: 'q_auto_3',
        text: 'Are you planning to finance, lease, or pay cash?',
        weight: 20,
        required: false,
        idealAnswer: 'Financing or Cash ready',
      },
      {
        id: 'q_auto_4',
        text: 'When would you like to come in for a 20-minute test drive / inspection?',
        weight: 20,
        required: true,
        idealAnswer: 'This weekend or tomorrow',
      },
    ],
    suggestedKnowledge: [
      {
        id: 'k_auto_1',
        category: 'Financing',
        question: 'What are your interest rates and financing terms?',
        answer: 'We offer financing as low as 2.9% APR for qualified buyers, working with 15+ trusted credit unions and banks.',
      },
      {
        id: 'k_auto_2',
        category: 'Warranty',
        question: 'Do certified pre-owned vehicles include a warranty?',
        answer: 'All our certified vehicles include a 100,000-mile powertrain warranty and 24/7 roadside assistance.',
      },
    ],
  },

  custom: {
    id: 'custom',
    name: 'Custom AI Worker',
    badge: 'Universal',
    icon: 'Sliders',
    color: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
    tagline: 'A clean slate tailored to any unique business, e-commerce store, or agency.',
    description:
      'Build your own custom AI agent from scratch. Perfect for e-commerce, fitness coaches, consultants, event organizers, and specialized services.',
    defaultTone: 'friendly',
    defaultEmoji: 'subtle',
    sampleGreeting:
      'Hi there! 👋 Thanks for reaching out. How can we help you achieve your goals today?',
    defaultBookingUrl: 'https://calendly.com/your-name/intro',
    suggestedQuestions: [
      {
        id: 'q_cust_1',
        text: 'What is your primary goal or requirement?',
        weight: 40,
        required: true,
        idealAnswer: 'Clear business requirement',
      },
      {
        id: 'q_cust_2',
        text: 'What is your timeline to get started?',
        weight: 30,
        required: true,
        idealAnswer: 'Within next 2 weeks',
      },
      {
        id: 'q_cust_3',
        text: 'What is your target investment or budget range?',
        weight: 30,
        required: false,
        idealAnswer: 'Ready to proceed',
      },
    ],
    suggestedKnowledge: [
      {
        id: 'k_cust_1',
        category: 'Company Info',
        question: 'What services do you provide?',
        answer: 'We provide specialized customer solutions designed to save time and deliver results.',
      },
    ],
  },
};
