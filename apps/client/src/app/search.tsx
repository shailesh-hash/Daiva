import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, TextInput, View } from 'react-native';

import { CategoryChip } from '@/components/category-chip';
import { SampleBanner } from '@/components/sample-banner';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenState } from '@/components/screen-state';
import { StoryGrid } from '@/components/story-grid';
import { ThemedText } from '@/components/themed-text';
import { MinTapTarget, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  collectUniqueCategorySlugs,
  useSearchStoriesQuery,
  useStoriesQuery,
} from '@/lib/catalogue-hooks';
import { listCategories } from '@/lib/catalog';

export default function SearchScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; category?: string }>();
  const query = typeof params.q === 'string' ? params.q : '';
  const category =
    typeof params.category === 'string' && params.category.length > 0 ? params.category : undefined;
  const storiesQuery = useStoriesQuery();
  const searchQuery = useSearchStoriesQuery(query, category);
  const categories =
    storiesQuery.data && storiesQuery.data.length > 0
      ? collectUniqueCategorySlugs(storiesQuery.data).map((slug) => ({
          slug,
          title: listCategories().find((item) => item.slug === slug)?.title ?? slug,
        }))
      : listCategories();
  const usingSearch = query.trim().length > 0;
  const activeQuery = usingSearch ? searchQuery : storiesQuery;
  const results = usingSearch
    ? (searchQuery.data ?? [])
    : (storiesQuery.data ?? []).filter((story) =>
        category ? story.categorySlugs.includes(category) : true,
      );

  return (
    <ScreenContainer>
      <ThemedText type="title" accessibilityRole="header">
        Search
      </ThemedText>
      <SampleBanner />
      <TextInput
        accessibilityLabel="Search sample stories"
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={(value) => {
          router.setParams({ q: value, category: category ?? '' });
        }}
        placeholder="Title, tag, language, or category"
        placeholderTextColor={theme.textSecondary}
        returnKeyType="search"
        style={[
          styles.input,
          {
            color: theme.text,
            backgroundColor: theme.backgroundElement,
          },
        ]}
        value={query}
      />
      <View style={styles.chips}>
        <CategoryChip
          label="All"
          selected={!category}
          onPress={() => {
            router.setParams({ q: query, category: '' });
          }}
        />
        {categories.map((item) => (
          <CategoryChip
            key={item.slug}
            label={item.title}
            selected={category === item.slug}
            onPress={() => {
              router.setParams({
                q: query,
                category: category === item.slug ? '' : item.slug,
              });
            }}
          />
        ))}
      </View>
      {activeQuery.isPending ? (
        <ScreenState
          kind="loading"
          title="Searching catalogue"
          message="Looking through published stories only."
        />
      ) : activeQuery.isError ? (
        <ScreenState
          kind="error"
          title="Search unavailable"
          message="The catalogue search request failed."
          actionLabel="Try again"
          onAction={() => {
            void activeQuery.refetch();
          }}
        />
      ) : results.length === 0 ? (
        <ScreenState
          kind="empty"
          title="No matching sample stories"
          message="Try another word or clear the category filter. Draft stories never appear here."
        />
      ) : (
        <StoryGrid stories={results} />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: MinTapTarget,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
