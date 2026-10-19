import { Fragment } from 'react';
import { Linking, StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { colors } from '@/lib/theme';

type Props = { children: string; style?: StyleProp<TextStyle>; numberOfLines?: number };

const TOKEN = /(\*\*\*[\s\S]+?\*\*\*|\*\*[\s\S]+?\*\*|\*[\s\S]+?\*|\`[^\`]+\`|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s]+|\n)/g;

export function MarkdownText({ children, style, numberOfLines }: Props) {
  const parts = String(children ?? '').split(TOKEN).filter(Boolean);
  return (
    <Text style={[styles.base, style]} numberOfLines={numberOfLines}>
      {parts.map((part, index) => {
        if (part === '\n') return '\n';
        const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
        if (link) return <Text key={index} style={styles.link} onPress={() => Linking.openURL(link[2]).catch(() => {})}>{link[1]}</Text>;
        if (/^https?:\/\//.test(part)) return <Text key={index} style={styles.link} onPress={() => Linking.openURL(part.replace(/[),.!?]+$/, '')).catch(() => {})}>{part}</Text>;
        if (part.startsWith('***') && part.endsWith('***')) return <Text key={index} style={styles.boldItalic}>{part.slice(3, -3)}</Text>;
        if (part.startsWith('**') && part.endsWith('**')) return <Text key={index} style={styles.bold}>{part.slice(2, -2)}</Text>;
        if (part.startsWith('*') && part.endsWith('*')) return <Text key={index} style={styles.italic}>{part.slice(1, -1)}</Text>;
        if (part.startsWith('`') && part.endsWith('`')) return <Text key={index} style={styles.code}>{part.slice(1, -1)}</Text>;
        return <Fragment key={index}>{part}</Fragment>;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { color: colors.foreground, fontFamily: 'sans-serif', fontSize: 14, lineHeight: 22, includeFontPadding: false },
  bold: { fontWeight: '800' },
  italic: { fontStyle: 'italic' },
  boldItalic: { fontWeight: '800', fontStyle: 'italic' },
  link: { color: colors.primary, textDecorationLine: 'underline' },
  code: { fontFamily: 'monospace', color: colors.primary, backgroundColor: colors.card },
});
