import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// 会话类型
interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: number;
}

// 模拟数据
const mockConversations: Conversation[] = [
  {
    id: '1',
    title: '关于AI的讨论',
    lastMessage: 'AI Agent可以帮助我们完成很多任务...',
    updatedAt: Date.now() - 1000 * 60 * 5,
  },
  {
    id: '2',
    title: '代码问题咨询',
    lastMessage: '让我来帮你分析这段代码...',
    updatedAt: Date.now() - 1000 * 60 * 30,
  },
];

// 会话列表屏幕
export default function ConversationListScreen({ navigation }: any) {
  const [conversations, setConversations] = useState(mockConversations);

  const createNewConversation = () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: `新对话 ${conversations.length + 1}`,
      lastMessage: '',
      updatedAt: Date.now(),
    };
    setConversations(prev => [newConversation, ...prev]);
    navigation.navigate('Chat', { 
      id: newConversation.id,
      title: newConversation.title,
    });
  };

  const deleteConversation = (id: string) => {
    Alert.alert(
      '删除对话',
      '确定要删除这个对话吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            setConversations(prev => prev.filter(c => c.id !== id));
          },
        },
      ]
    );
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 1000 * 60) return '刚刚';
    if (diff < 1000 * 60 * 60) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 1000 * 60 * 60 * 24) return `${Math.floor(diff / 3600000)}小时前`;
    return new Date(timestamp).toLocaleDateString('zh-CN');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 头部 */}
      <View style={styles.header}>
        <Text style={styles.title}>AI Agent</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* 会话列表 */}
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.conversationItem}
            onPress={() => navigation.navigate('Chat', {
              id: item.id,
              title: item.title,
            })}
            onLongPress={() => deleteConversation(item.id)}
          >
            <View style={styles.conversationIcon}>
              <Ionicons name="chatbubble-outline" size={24} color="#007AFF" />
            </View>
            <View style={styles.conversationContent}>
              <Text style={styles.conversationTitle}>{item.title}</Text>
              <Text style={styles.conversationPreview} numberOfLines={1}>
                {item.lastMessage || '暂无消息'}
              </Text>
            </View>
            <Text style={styles.conversationTime}>
              {formatTime(item.updatedAt)}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>暂无对话</Text>
            <Text style={styles.emptyHint}>点击右下角按钮开始新对话</Text>
          </View>
        }
      />

      {/* 新建对话按钮 */}
      <TouchableOpacity
        style={styles.newButton}
        onPress={createNewConversation}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  settingsButton: {
    padding: 8,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  conversationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  conversationContent: {
    flex: 1,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  conversationPreview: {
    fontSize: 14,
    color: '#999',
  },
  conversationTime: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
  },
  emptyHint: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
  newButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
