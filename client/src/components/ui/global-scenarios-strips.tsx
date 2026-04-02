import { Card } from "@/components/ui/card";
import scenario1 from "@assets/generated_images/AU_Singapore_large_characters_onboarding_826905d5.png";
import scenario2 from "@assets/generated_images/UK_India_large_characters_no_entity_3ea2e13b.png";
import scenario3 from "@assets/generated_images/NZ_USA_large_characters_expansion_5a820e8b.png";
import scenario4 from "@assets/generated_images/Brazil_Australia_large_characters_compliance_c4c95486.png";
import scenario5 from "@assets/generated_images/Australian_agency_global_opportunities_9b9fe8b4.png";
import scenario6 from "@assets/generated_images/India_Africa_lady_saree_borderless_337a5df7.png";
import scenario7 from "@assets/generated_images/Australian_to_USA_EOR_solution_12fe56cb.png";
import scenario8 from "@assets/generated_images/Japanese_EOR_cropped_tight_1560e00c.png";
import scenario9 from "@assets/generated_images/Ireland_Canada_dual_entity_EOR_09b2d621.png";

const scenarios = [
  {
    id: "au-sg-onboarding",
    image: scenario1,
    countryTags: "AU → SG",
    benefitChip: "1-hour onboarding",
    caption: "Australian business engages Singapore freelancer in under an hour",
    alt: "Cartoon illustration showing Australian business person quickly onboarding Singapore freelancer in 1 hour"
  },
  {
    id: "uk-in-noentity", 
    image: scenario2,
    countryTags: "UK → IN",
    benefitChip: "No local entity",
    caption: "UK firm hires 2 Indian engineers for AI—no entity setup required",
    alt: "Cartoon illustration showing UK business hiring Indian software engineers without local entity setup"
  },
  {
    id: "nz-us-expansion",
    image: scenario3, 
    countryTags: "NZ → US",
    benefitChip: "Expand globally",
    caption: "NZ recruiter supplies US contractors via SDP Global Pay",
    alt: "Cartoon illustration showing New Zealand recruiter expanding globally to connect US contractors"
  },
  {
    id: "br-au-compliance",
    image: scenario4,
    countryTags: "BR ↔ AU", 
    benefitChip: "Compliant, on-time pay",
    caption: "Brazilian freelancer paid by AU business with compliance & assurance",
    alt: "Cartoon illustration showing compliant payment flow between Brazilian freelancer and Australian business"
  },
  {
    id: "au-multi-placement",
    image: scenario5,
    countryTags: "AU → IN & US",
    benefitChip: "Multi-country placement", 
    caption: "Australian agency places contractors to clients in India and USA",
    alt: "Cartoon illustration showing Australian agency placing contractors to business clients in India and USA"
  },
  {
    id: "in-africa-borderless",
    image: scenario6,
    countryTags: "IN ↔ Africa",
    benefitChip: "Borderless hiring",
    caption: "Indian company taps African talent seamlessly",
    alt: "Cartoon illustration showing diverse connection between Indian company and African talent with human warmth"
  },
  {
    id: "au-us-noentity",
    image: scenario7,
    countryTags: "AU → US",
    benefitChip: "No local entity needed",
    caption: "Australian company places consultants with USA client without USA entity—SDP employs contractors and manages margin transfer",
    alt: "Cartoon illustration showing Australian agency placing consultants to USA client through SDP Global Pay without local entity"
  },
  {
    id: "jp-multicountry-eor",
    image: scenario8,
    countryTags: "JP → 8 Countries",
    benefitChip: "Unified EOR & billing",
    caption: "Japanese agency manages workers across 8 countries on 4-12 month projects with unified EOR and billing solution",
    alt: "Cartoon illustration showing Japanese agency managing multi-country workforce with unified SDP Global Pay solution"
  },
  {
    id: "ie-ca-crossborder",
    image: scenario9,
    countryTags: "IE → CA",
    benefitChip: "Cross-border employment",
    caption: "Irish worker provides services to Canadian business—SDP Ireland employs worker, SDP Canada onhires to client",
    alt: "Cartoon illustration showing cross-border employment from Ireland to Canada through SDP Global Pay entities"
  }
];

export function GlobalScenariosStrips() {
  return (
    <div className="bg-white rounded-3xl p-12 shadow-xl mb-20">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold text-secondary-900 mb-6">Real Scenarios, Real Impact</h2>
        <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
          See how businesses worldwide use SDP Global Pay to solve real hiring challenges
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {scenarios.map((scenario) => (
          <Card 
            key={scenario.id}
            className="border border-secondary-200 shadow-lg hover:shadow-xl transition-all duration-300 bg-white"
            data-testid={`strip-scenario-${scenario.id}`}
          >
            <div className="p-6">
              {/* Country Tags */}
              <div className="flex justify-center mb-4">
                <div className="inline-flex px-3 py-1 bg-secondary-100 text-secondary-700 rounded-full text-sm font-medium">
                  {scenario.countryTags}
                </div>
              </div>

              {/* Illustration */}
              <div className="mb-8 flex justify-center">
                <img 
                  src={scenario.image} 
                  alt={scenario.alt}
                  className="w-full max-w-3xl h-96 object-contain rounded-lg"
                />
              </div>

              {/* Benefit Chip */}
              <div className="flex justify-center mb-4">
                <div className="inline-flex px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold border border-primary-200">
                  {scenario.benefitChip}
                </div>
              </div>

              {/* Caption */}
              <p className="text-sm text-secondary-600 text-center leading-relaxed">
                {scenario.caption}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}