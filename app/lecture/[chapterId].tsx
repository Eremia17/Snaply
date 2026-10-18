import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { fetchPages } from '@/lib/catalog';
import { colors } from '@/lib/theme';

const W = Dimensions.get('window').width;

export default function LectureScreen() {
  const { chapterId, title } = useLocalSearchParams<{ chapterId: string; title?: string }>();
  const [pages, setPages] = useState<string[] | null>(null);

  useEffect(() => {
    fetchPages(String(chapterId)).then(setPages);
  }, [chapterId]);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: title ? String(title) : 'Lecture', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground, headerShadowVisible: false }} />
      <View style={styles.root}>
        {pages === null ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : pages.length === 0 ? (
          <Text style={styles.empty}>Les pages de ce chapitre ne sont pas disponibles.</Text>
        ) : (
          <FlatList
            data={pages}
            keyExtractor={(u, i) => `${i}`}
            renderItem={({ item }) => <Image source={{ uri: item }} style={{ width: W, height: W * 1.45 }} resizeMode="contain" />}
            initialNumToRender={3}
            windowSize={5}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  empty: { color: colors.mutedForeground, textAlign: 'center', marginTop: 40, paddingHorizontal: 24 },
});