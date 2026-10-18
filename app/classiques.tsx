import { Dimensions, FlatList, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { PosterCard } from '@/components/PosterCard';
import { classics, useCatalog } from '@/lib/catalog';
import { colors } from '@/lib/theme';

const COLS = 3;
const CARD_W = (Dimensions.get('window').width - 32) / COLS - 8;

export default function ClassiquesScreen() {
  useCatalog();
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Classiques du domaine public', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground }} />
      <View style={styles.root}>
        <Text style={styles.hint}>Œuvres tombées dans le domaine public.</Text>
        <FlatList
          data={classics()}
          numColumns={COLS}
          keyExtractor={(i) => `${i.kind}:${i.id}`}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          renderItem={({ item }) => <PosterCard item={item} width={CARD_W} />}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  hint: { color: colors.mutedForeground, paddingHorizontal: 16, paddingTop: 16 },
});