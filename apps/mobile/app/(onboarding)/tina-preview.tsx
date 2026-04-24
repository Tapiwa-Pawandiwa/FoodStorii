import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SignUpSheet } from '../../src/components/auth/SignUpSheet';

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_RECIPES = [
  {
    id: '1',
    name: 'Spinach & Chickpea Curry',
    time: '20 min',
    difficulty: 'Easy',
    match: '94%',
  },
  {
    id: '2',
    name: 'Wilted Spinach Pasta',
    time: '15 min',
    difficulty: 'Easy',
    match: '88%',
  },
];

const QUICK_REPLIES = ['Show me more', 'Something quicker'];

// ── Sub-components ────────────────────────────────────────────────────────────

function Header() {
  return (
    <View style={S.header}>
      <View style={S.headerLeft}>
        <View style={S.headerAvatar}>
          <Ionicons name="sparkles" size={20} color="#FFFFFF" />
        </View>
        <View>
          <View style={S.headerNameRow}>
            <Text style={S.headerName}>TINA</Text>
            <View style={S.demoBadge}>
              <Text style={S.demoBadgeText}>DEMO</Text>
            </View>
          </View>
          <Text style={S.headerSub}>YOUR KITCHEN AI</Text>
        </View>
      </View>
    </View>
  );
}

function ExpiryCard() {
  return (
    <View style={S.expiryCard}>
      <View style={S.expiryLeft} />
      <View style={S.expiryContent}>
        <Ionicons name="alert-circle" size={14} color="#FFAA00" style={{ marginRight: 6 }} />
        <Text style={S.expiryText}>
          Spinach expires tomorrow — these recipes use it first.
        </Text>
      </View>
    </View>
  );
}

function RecipeCard({ recipe, onSaveLocked }: { recipe: typeof MOCK_RECIPES[0]; onSaveLocked: () => void }) {
  return (
    <View style={S.recipeCard}>
      {/* Photo placeholder */}
      <View style={S.recipePhoto}>
        <Ionicons name="restaurant" size={28} color="#C4BEB8" />
      </View>

      <View style={S.recipeBody}>
        <Text style={S.recipeName}>{recipe.name}</Text>
        <View style={S.recipeMeta}>
          <Ionicons name="time-outline" size={12} color="#5A5A52" />
          <Text style={S.recipeMetaText}>{recipe.time}</Text>
          <Text style={S.recipeMetaDot}>·</Text>
          <Text style={S.recipeMetaText}>{recipe.difficulty}</Text>
          <Text style={S.recipeMetaDot}>·</Text>
          <Text style={S.recipeMatch}>{recipe.match} match</Text>
        </View>

        <View style={S.recipeActions}>
          <TouchableOpacity style={S.viewBtn} activeOpacity={0.88}>
            <Text style={S.viewBtnText}>View Recipe</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.saveBtn} activeOpacity={0.88} onPress={onSaveLocked}>
            <Text style={S.saveBtnText}>Save Recipe 🔒</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function TinaMessage() {
  return (
    <View style={S.tinaMessageCard}>
      <View style={S.tinaAvatar}>
        <Ionicons name="sparkles" size={14} color="#FFFFFF" />
      </View>
      <View style={S.tinaMessageBubble}>
        <Text style={S.tinaMessageText}>
          Want to save these recipes and get personalised suggestions? Sign up to continue!
        </Text>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function TinaPreviewScreen() {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <SafeAreaView style={S.safe}>
      <StatusBar barStyle="dark-content" />

      <Header />

      <ScrollView
        contentContainerStyle={S.scroll}
        showsVerticalScrollIndicator={false}
      >
        <ExpiryCard />

        <Text style={S.sectionLabel}>SUGGESTED FOR YOU</Text>

        {MOCK_RECIPES.map((r) => (
          <RecipeCard key={r.id} recipe={r} onSaveLocked={() => setSheetOpen(true)} />
        ))}

        <TinaMessage />

        {/* Quick reply chips */}
        <View style={S.chips}>
          {QUICK_REPLIES.map((r) => (
            <TouchableOpacity
              key={r}
              style={S.chip}
              activeOpacity={0.75}
              onPress={() => setSheetOpen(true)}
            >
              <Text style={S.chipText}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom spacing for fixed button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed bottom CTA */}
      <View style={S.footer}>
        <TouchableOpacity
          style={S.ctaBtn}
          activeOpacity={0.88}
          onPress={() => setSheetOpen(true)}
        >
          <Text style={S.ctaBtnText}>Sign up or sign in to save your results</Text>
        </TouchableOpacity>
      </View>

      <SignUpSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F0F0' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE4E4',
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#25671E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A18',
    letterSpacing: 0.5,
  },
  demoBadge: {
    backgroundColor: '#FFF4D6',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  demoBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFAA00',
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 10,
    fontWeight: '500',
    color: '#48A111',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },

  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },

  // Expiry card
  expiryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF4D6',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  expiryLeft: {
    width: 4,
    backgroundColor: '#FFAA00',
  },
  expiryContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  expiryText: {
    flex: 1,
    fontSize: 13,
    color: '#1A1A18',
    lineHeight: 18,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#5A5A52',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  // Recipe card
  recipeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAE4E4',
    marginBottom: 12,
    overflow: 'hidden',
  },
  recipePhoto: {
    height: 120,
    backgroundColor: '#F0EDE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeBody: {
    padding: 16,
  },
  recipeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A18',
    marginBottom: 6,
  },
  recipeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 14,
  },
  recipeMetaText: {
    fontSize: 12,
    color: '#5A5A52',
  },
  recipeMetaDot: {
    fontSize: 12,
    color: '#C4BEB8',
  },
  recipeMatch: {
    fontSize: 12,
    color: '#48A111',
    fontWeight: '600',
  },
  recipeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewBtn: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#48A111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveBtn: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAE4E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5A5A52',
  },

  // Tina message
  tinaMessageCard: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  tinaAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#48A111',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tinaMessageBubble: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAE4E4',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  tinaMessageText: {
    fontSize: 14,
    color: '#1A1A18',
    lineHeight: 20,
  },

  // Quick replies
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#48A111',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 13,
    color: '#48A111',
    fontWeight: '600',
  },

  // Footer CTA
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F7F0F0',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#EAE4E4',
  },
  ctaBtn: {
    backgroundColor: '#25671E',
    borderRadius: 999,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  ctaBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
