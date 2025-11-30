import { DIFFICULTY_LEVELS } from '@/lib/constants';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: "Difficulty Levels - The Pattern's Place",
  description: 'Learn about the different difficulty levels for sewing and crafting patterns.',
};

export default function DifficultyLevelsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/marketplace">
          <Button variant="ghost" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Marketplace
          </Button>
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-2">Difficulty Levels</h1>
      <p className="text-muted-foreground mb-8">
        Understanding the skill level required for each pattern helps you find projects that match
        your experience.
      </p>

      <div className="space-y-6">
        {DIFFICULTY_LEVELS.map(level => (
          <div key={level.value} className="p-6 rounded-xl border bg-card">
            <div className="flex items-center gap-3 mb-3">
              <span
                className="px-4 py-1.5 rounded-full text-sm font-semibold"
                style={{
                  backgroundColor: level.color,
                  color: level.textColor,
                }}
              >
                {level.label}
              </span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {getDifficultyDescription(level.value)}
            </p>
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium mb-2">What to expect:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {getDifficultyExpectations(level.value).map((expectation, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    {expectation}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 p-6 rounded-xl bg-muted/50 border">
        <h2 className="text-xl font-semibold mb-3">Tips for Choosing the Right Level</h2>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            If you're new to a craft, start with Beginner patterns to build confidence
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            Challenge yourself gradually — try Intermediate patterns once you're comfortable with
            basics
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            Advanced and Expert patterns often require specialized tools or techniques
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            Read the pattern description carefully for specific skill requirements
          </li>
        </ul>
      </div>
    </div>
  );
}

function getDifficultyDescription(value: string): string {
  switch (value) {
    case 'beginner':
      return 'Perfect for those just starting out or looking for a quick, satisfying project. These patterns use basic techniques and straightforward instructions that anyone can follow.';
    case 'intermediate':
      return 'Designed for makers who have mastered the basics and are ready to learn new techniques. These patterns introduce more complex elements while still being approachable.';
    case 'advanced':
      return 'For experienced crafters who are comfortable with a wide range of techniques. These patterns feature intricate details, multiple components, and require careful attention.';
    case 'expert':
      return 'The most challenging patterns for highly skilled makers. These projects demand extensive experience, precision, and often involve specialized techniques or complex construction.';
    default:
      return '';
  }
}

function getDifficultyExpectations(value: string): string[] {
  switch (value) {
    case 'beginner':
      return [
        'Simple, easy-to-follow instructions',
        'Basic stitches and techniques',
        'Minimal shaping or fitting',
        'Great for learning fundamental skills',
        'Typically quicker to complete',
      ];
    case 'intermediate':
      return [
        'Some experience with basic techniques required',
        'Introduction to new stitches or methods',
        'May include simple shaping or fitting',
        'More detailed instructions and steps',
        'Moderate time investment',
      ];
    case 'advanced':
      return [
        'Solid foundation in multiple techniques',
        'Complex shaping, fitting, or construction',
        'Requires reading and interpreting detailed patterns',
        'May need specialized tools or materials',
        'Longer time commitment expected',
      ];
    case 'expert':
      return [
        'Mastery of advanced techniques required',
        'Highly complex construction or finishing',
        'Professional-level precision needed',
        'Often requires specialized equipment',
        'Significant time and skill investment',
      ];
    default:
      return [];
  }
}
