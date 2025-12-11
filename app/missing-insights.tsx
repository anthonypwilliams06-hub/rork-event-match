import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Shield, Map, Users2, Sparkles, DollarSign, Activity } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface FeatureCategory {
  id: string;
  title: string;
  summary: string;
  highlights: string[];
  icon: React.ComponentType<{ color?: string; size?: number }>;
  accent: string;
}

const accentPalette = ['#F97316', '#06B6D4', '#A855F7', '#84CC16', '#EC4899', '#0EA5E9'] as const;

export default function MissingInsightsScreen() {
  const categories = useMemo<FeatureCategory[]>(() => [
    {
      id: 'safety',
      title: 'Safety, Trust & Verification',
      summary: 'Identity checks, SOS tools, AI moderation for a safer ecosystem.',
      highlights: [
        'Photo + government ID verification',
        'Trusted contacts with live check-ins',
        'SOS panic action and safety prompts',
        'Automated moderation for chats & media',
      ],
      icon: Shield,
      accent: accentPalette[0],
    },
    {
      id: 'discovery',
      title: 'Immersive Event Discovery',
      summary: 'Help seekers explore richer event context on map, vibe, and time.',
      highlights: [
        'Live map with "near me now" layer',
        'Last-minute & bundle recommendations',
        'Attendance visibility + host history',
        'Vibe tags to capture experience tone',
      ],
      icon: Map,
      accent: accentPalette[1],
    },
    {
      id: 'community',
      title: 'Community & Engagement',
      summary: 'Behaviors that keep members coming back weekly.',
      highlights: [
        'Interest-based groups & topic boards',
        'Shared activity prompts & icebreakers',
        'Moments/stories for post-event recaps',
        'Feedback loops like "Did you vibe?"',
      ],
      icon: Users2,
      accent: accentPalette[2],
    },
    {
      id: 'matching',
      title: 'Adaptive Matching Intelligence',
      summary: 'Contextualizes why matches matter and adapts over time.',
      highlights: [
        'Preference learning from user actions',
        'Dealbreaker filters (smoking, pets, etc.)',
        'Granular "why you matched" storytelling',
        'Compatibility micro-metrics beyond score',
      ],
      icon: Sparkles,
      accent: accentPalette[3],
    },
    {
      id: 'monetization',
      title: 'Monetization & Premium',
      summary: 'Unlock revenue for both creators and seekers.',
      highlights: [
        'Paid events with refunds & payouts',
        'Creator analytics + highlight boosts',
        'Priority access & who-viewed-me perks',
        'Referral boosts and streak rewards',
      ],
      icon: DollarSign,
      accent: accentPalette[4],
    },
    {
      id: 'analytics',
      title: 'Analytics & Ops Infrastructure',
      summary: 'Visibility for creators and internal ops to scale safely.',
      highlights: [
        'Creator dashboards (conversion, return rate)',
        'Admin moderation queue & role controls',
        'Fraud/spam monitoring pipelines',
        'Growth levers (referrals, onboarding quiz)',
      ],
      icon: Activity,
      accent: accentPalette[5],
    },
  ], []);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0F172A', '#1F2937']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        testID="missing-insights-scroll"
      >
        <View style={styles.hero}>
          <Text style={styles.kicker}>Opportunity Radar</Text>
          <Text style={styles.title}>What still separates MVP from a market-ready release?</Text>
          <Text style={styles.subtitle}>
            These pillars package the strategic gaps surfaced during the last audit. Knock them out to
            boost trust, retention, and monetization simultaneously.
          </Text>
        </View>

        {categories.map((category) => (
          <View
            key={category.id}
            style={[styles.card, { borderColor: category.accent }]}
            testID={`missing-card-${category.id}`}
          >
            <View style={[styles.iconBadge, { backgroundColor: `${category.accent}20` }]}
              testID={`missing-icon-${category.id}`}
            >
              <category.icon color={category.accent} size={28} />
            </View>
            <Text style={styles.cardTitle}>{category.title}</Text>
            <Text style={styles.cardSummary}>{category.summary}</Text>
            <View style={styles.tagGrid}>
              {category.highlights.map((highlight) => (
                <View key={highlight} style={styles.tag} testID={`missing-highlight-${highlight}`}>
                  <Text style={styles.tagText}>{highlight}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    paddingTop: 60,
    paddingBottom: 80,
    paddingHorizontal: 24,
    gap: 24,
  },
  hero: {
    gap: 12,
  },
  kicker: {
    color: Colors.secondary,
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    fontWeight: '600' as const,
  },
  title: {
    color: Colors.text.white,
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    gap: 12,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: Colors.text.white,
    fontSize: 20,
    fontWeight: '700' as const,
  },
  cardSummary: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    lineHeight: 22,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tagText: {
    color: Colors.text.white,
    fontSize: 13,
    fontWeight: '500' as const,
  },
});
