import { useTranslate } from '@/hooks/common-hooks';
import { MenuProps, Space } from 'antd';
import React, { useCallback, useMemo } from 'react';
import User from '../user';

import { useTheme } from '@/components/theme-provider';
import { LanguageList, LanguageMap } from '@/constants/common';
import { useChangeLanguage } from '@/hooks/logic-hooks';
import { useFetchUserInfo, useListTenant } from '@/hooks/user-setting-hooks';
import { TenantRole } from '@/pages/user-setting/constants';
import { BellRing } from 'lucide-react';
import { useNavigate } from 'umi';
import styled from './index.less';

/**
 * 圆形容器组件 - 为工具栏图标提供统一的圆形背景样式
 * @param children - 子组件内容
 * @param restProps - 其他传递给div的属性
 */
const Circle = ({ children, ...restProps }: React.PropsWithChildren) => {
  return (
    <div {...restProps} className={styled.circle}>
      {children}
    </div>
  );
};

/**
 * 处理GitHub链接点击事件 - 在新窗口中打开GitHub仓库
 */
const handleGithubCLick = () => {
  window.open('https://github.com/infiniflow/ragflow', 'target');
};

/**
 * 处理文档帮助链接点击事件 - 在新窗口中打开文档页面
 */
const handleDocHelpCLick = () => {
  window.open('https://ragflow.io/docs/dev/category/guides', 'target');
};

/**
 * 右侧工具栏组件 - 包含语言切换、主题切换、GitHub链接、帮助文档、通知铃铛等功能
 */
const RightToolBar = () => {
  // 获取国际化翻译函数
  const { t } = useTranslate('common');
  // 获取语言切换函数
  const changeLanguage = useChangeLanguage();
  // 获取主题相关状态和设置函数
  const { setTheme, theme } = useTheme();
  // 获取路由导航函数
  const navigate = useNavigate();

  // 获取用户信息，默认语言为英语
  const {
    data: { language = 'English' },
  } = useFetchUserInfo();

  /**
   * 处理语言菜单项点击事件
   * @param key - 选中的语言键值
   */
  const handleItemClick: MenuProps['onClick'] = ({ key }) => {
    changeLanguage(key);
  };

  // 获取租户列表数据
  const { data } = useListTenant();

  /**
   * 判断是否显示通知铃铛 - 当存在邀请角色的租户时显示
   */
  const showBell = useMemo(() => {
    return data.some((x) => x.role === TenantRole.Invite);
  }, [data]);

  /**
   * 构建语言下拉菜单项 - 在每个语言选项之间添加分隔线
   */
  const items: MenuProps['items'] = LanguageList.map((x) => ({
    key: x,
    label: <span>{LanguageMap[x as keyof typeof LanguageMap]}</span>,
  })).reduce<MenuProps['items']>((pre, cur) => {
    return [...pre!, { type: 'divider' }, cur];
  }, []);

  /**
   * 切换到浅色主题
   */
  const onMoonClick = React.useCallback(() => {
    setTheme('light');
  }, [setTheme]);

  /**
   * 切换到深色主题
   */
  const onSunClick = React.useCallback(() => {
    setTheme('dark');
  }, [setTheme]);

  /**
   * 处理通知铃铛点击事件 - 导航到团队设置页面
   */
  const handleBellClick = useCallback(() => {
    navigate('/user-setting/team');
  }, [navigate]);

  return (
    <div className={styled.toolbarWrapper}>
      <Space wrap size={16}>
        {/* 语言切换下拉菜单 - 目前已注释屏蔽，用户只能使用简体中文 */}
        {/* <Dropdown menu={{ items, onClick: handleItemClick }} placement="bottom">
          <Space className={styled.language}>
            <b>{t(camelCase(language))}</b>
            <DownOutlined />
          </Space>
        </Dropdown> */}

        {/* GitHub链接图标 */}
        {/* <Circle>
          <GithubOutlined onClick={handleGithubCLick} />
        </Circle> */}

        {/* 帮助文档链接图标 */}
        {/* <Circle>
          <CircleHelp className="size-4" onClick={handleDocHelpCLick} />
        </Circle> */}

        {/* 主题切换图标 - 根据当前主题显示不同的图标 */}
        {/* <Circle>
          {theme === 'dark' ? (
            <MoonIcon onClick={onMoonClick} size={20} />
          ) : (
            <SunIcon onClick={onSunClick} size={20} />
          )}
        </Circle> */}

        {/* 通知铃铛 - 仅在有邀请通知时显示，带有红色提示点 */}
        {showBell && (
          <Circle>
            <div className="relative" onClick={handleBellClick}>
              <BellRing className="size-4 " />
              <span className="absolute size-1 rounded -right-1 -top-1 bg-red-600"></span>
            </div>
          </Circle>
        )}

        {/* 用户信息组件 */}
        <User></User>
      </Space>
    </div>
  );
};

export default RightToolBar;
