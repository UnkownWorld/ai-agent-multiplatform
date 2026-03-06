import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// 设置屏幕
export default function SettingsScreen({ navigation }: any) {
  const [settings, setSettings] = useState({
    darkMode: false,
    notifications: true,
    autoSave: true,
    streamResponse: true,
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const SettingItem = ({
    icon,
    title,
    subtitle,
    value,
    onToggle,
    showArrow = false,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    value?: boolean;
    onToggle?: () => void;
    showArrow?: boolean;
  }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onToggle}
      disabled={!onToggle && !showArrow}
    >
      <View style={styles.settingIcon}>
        <Ionicons name={icon as any} size={22} color="#007AFF" />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {typeof value === 'boolean' && (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#ccc', true: '#007AFF' }}
        />
      )}
      {showArrow && (
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>设置</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView>
        {/* 外观设置 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>外观</Text>
          <SettingItem
            icon="moon-outline"
            title="深色模式"
            subtitle="切换深色/浅色主题"
            value={settings.darkMode}
            onToggle={() => toggleSetting('darkMode')}
          />
        </View>

        {/* 通知设置 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>通知</Text>
          <SettingItem
            icon="notifications-outline"
            title="推送通知"
            subtitle="接收新消息通知"
            value={settings.notifications}
            onToggle={() => toggleSetting('notifications')}
          />
        </View>

        {/* 对话设置 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>对话</Text>
          <SettingItem
            icon="save-outline"
            title="自动保存"
            subtitle="自动保存对话记录"
            value={settings.autoSave}
            onToggle={() => toggleSetting('autoSave')}
          />
          <SettingItem
            icon="pulse-outline"
            title="流式响应"
            subtitle="实时显示AI回复"
            value={settings.streamResponse}
            onToggle={() => toggleSetting('streamResponse')}
          />
        </View>

        {/* 模型设置 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>模型</Text>
          <SettingItem
            icon="cube-outline"
            title="选择模型"
            subtitle="GPT-4o"
            showArrow
          />
          <SettingItem
            icon="options-outline"
            title="高级设置"
            showArrow
          />
        </View>

        {/* 关于 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>关于</Text>
          <SettingItem
            icon="information-circle-outline"
            title="版本"
            subtitle="1.0.0"
          />
          <SettingItem
            icon="document-text-outline"
            title="隐私政策"
            showArrow
          />
          <SettingItem
            icon="help-circle-outline"
            title="帮助与反馈"
            showArrow
          />
        </View>

        {/* 清除数据 */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={() => {
              Alert.alert(
                '清除所有数据',
                '此操作将删除所有对话记录和设置，且不可恢复。',
                [
                  { text: '取消', style: 'cancel' },
                  {
                    text: '清除',
                    style: 'destructive',
                    onPress: () => {
                      Alert.alert('已清除', '所有数据已清除');
                    },
                  },
                ]
              );
            }}
          >
            <Text style={styles.dangerButtonText}>清除所有数据</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 13,
    color: '#999',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#333',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  dangerButton: {
    backgroundColor: '#fff',
    padding: 16,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: 16,
    color: '#FF3B30',
  },
});
