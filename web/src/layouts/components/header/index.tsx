// 导入SVG图标组件
import { ReactComponent as KnowledgeBaseIcon } from '@/assets/svg/knowledge-base.svg';
// 导入自定义hooks
import { useTranslate } from '@/hooks/common-hooks';
import { useFetchAppConf } from '@/hooks/logic-hooks';
import { useNavigateWithFromState } from '@/hooks/route-hook';
// 导入Ant Design组件和图标
import { MessageOutlined } from '@ant-design/icons';
import { Flex, Layout, Radio, Space, theme } from 'antd';
import { MouseEventHandler, useCallback, useMemo } from 'react';
import { useLocation } from 'umi';
import Toolbar from '../right-toolbar';

// 导入主题相关组件和样式
import { useTheme } from '@/components/theme-provider';
import styles from './index.less';

const { Header } = Layout;

/**
 * RAG应用的头部导航组件
 * 包含应用logo、导航菜单和工具栏
 */
const RagHeader = () => {
  // 获取Ant Design主题token
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  // 路由相关hooks
  const navigate = useNavigateWithFromState();
  const { pathname } = useLocation();

  // 国际化翻译hook
  const { t } = useTranslate('header');

  // 获取应用配置信息
  const appConf = useFetchAppConf();

  // 获取当前主题(深色/浅色)
  const { theme: themeRag } = useTheme();

  /**
   * 导航标签页数据
   * 包含路径、名称和图标
   */
  const tagsData = useMemo(
    () => [
      { path: '/knowledge', name: t('knowledgeBase'), icon: KnowledgeBaseIcon },
      { path: '/chat', name: t('chat'), icon: MessageOutlined },
      // 暂时屏蔽以下功能
      // { path: '/search', name: t('search'), icon: SearchOutlined },
      // { path: '/flow', name: t('flow'), icon: GraphIcon },
      // { path: '/file', name: t('fileManager'), icon: FileIcon },
    ],
    [t],
  );

  /**
   * 根据当前路径确定激活的导航项
   * 通过路径前缀匹配找到对应的导航名称
   */
  const currentPath = useMemo(() => {
    return (
      tagsData.find((x) => pathname.startsWith(x.path))?.name || 'knowledge'
    );
  }, [pathname, tagsData]);

  /**
   * 处理导航项点击事件
   * @param path - 目标路径
   * @returns 鼠标点击事件处理函数
   */
  const handleChange = useCallback(
    (path: string): MouseEventHandler =>
      (e) => {
        e.preventDefault();
        navigate(path);
      },
    [navigate],
  );

  /**
   * 处理Logo点击事件
   * 点击后跳转到首页
   */
  const handleLogoClick = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return (
    <Header
      style={{
        padding: '0 16px',
        background: colorBgContainer,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '72px',
      }}
    >
      {/* Logo区域 - 点击可跳转到首页 */}
      <a href={window.location.origin}>
        <Space
          size={12}
          onClick={handleLogoClick}
          className={styles.logoWrapper}
        >
          <img src="/logo.svg" alt="" className={styles.appIcon} />
          <span className={styles.appName}>{appConf.appName}</span>
        </Space>
      </a>

      {/* 导航菜单区域 */}
      <Space size={[0, 8]} wrap>
        <Radio.Group
          defaultValue="a"
          buttonStyle="solid"
          className={
            themeRag === 'dark' ? styles.radioGroupDark : styles.radioGroup
          }
          value={currentPath}
        >
          {tagsData.map((item, index) => (
            <Radio.Button
              // 根据主题和位置添加CSS类名
              className={`${themeRag === 'dark' ? 'dark' : 'light'} ${index === 0 ? 'first' : ''} ${index === tagsData.length - 1 ? 'last' : ''}`}
              value={item.name}
              key={item.name}
            >
              <a href={item.path}>
                <Flex
                  align="center"
                  gap={8}
                  onClick={handleChange(item.path)}
                  className="cursor-pointer"
                >
                  {/* 导航图标 - 根据是否为当前页面设置不同颜色 */}
                  <item.icon
                    className={styles.radioButtonIcon}
                    stroke={item.name === currentPath ? 'black' : 'white'}
                  ></item.icon>
                  {/* 导航文字 */}
                  {item.name}
                </Flex>
              </a>
            </Radio.Button>
          ))}
        </Radio.Group>
      </Space>

      {/* 右侧工具栏 */}
      <Toolbar></Toolbar>
    </Header>
  );
};

export default RagHeader;
