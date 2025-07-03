import { useLogin, useRegister } from '@/hooks/login-hooks';
import { useSystemConfig } from '@/hooks/system-hooks';
import { rsaPsw } from '@/utils';
import { Button, Checkbox, Form, Input } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon, useNavigate } from 'umi';
import RightPanel from './right-panel';

import { Domain } from '@/constants/common';
import styles from './index.less';

/**
 * 登录/注册页面组件
 * 支持用户登录、注册以及第三方登录功能
 */
const Login = () => {
  // 页面标题状态，控制显示登录或注册表单
  const [title, setTitle] = useState('login');

  // 路由导航钩子
  const navigate = useNavigate();

  // 登录和注册相关钩子
  const { login, loading: signLoading } = useLogin();
  const { register, loading: registerLoading } = useRegister();

  // 国际化翻译钩子
  const { t } = useTranslation('translation', { keyPrefix: 'login' });

  // 合并加载状态
  const loading = signLoading || registerLoading;

  // 系统配置钩子，获取注册是否启用
  const { config } = useSystemConfig();
  const registerEnabled = config?.registerEnabled !== 0;

  /**
   * 切换登录/注册标题
   * 如果注册未启用且当前为登录状态，则不允许切换
   */
  const changeTitle = () => {
    if (title === 'login' && !registerEnabled) {
      return;
    }
    setTitle((title) => (title === 'login' ? 'register' : 'login'));
  };

  // 表单实例
  const [form] = Form.useForm();

  // 页面加载时验证昵称字段
  useEffect(() => {
    form.validateFields(['nickname']);
  }, [form]);

  /**
   * 处理登录/注册表单提交
   * 根据当前页面状态执行登录或注册操作
   */
  const onCheck = async () => {
    try {
      // 验证表单字段
      const params = await form.validateFields();

      // 使用RSA加密密码
      const rsaPassWord = rsaPsw(params.password) as string;

      if (title === 'login') {
        // 执行登录操作
        const code = await login({
          email: `${params.email}`.trim(),
          password: rsaPassWord,
        });
        // 登录成功后跳转到知识库页面
        if (code === 0) {
          navigate('/knowledge');
        }
      } else {
        // 执行注册操作
        const code = await register({
          nickname: params.nickname,
          email: params.email,
          password: rsaPassWord,
        });
        // 注册成功后切换到登录页面
        if (code === 0) {
          setTitle('login');
        }
      }
    } catch (errorInfo) {
      console.log('Failed:', errorInfo);
    }
  };

  // 表单项布局配置
  const formItemLayout = {
    labelCol: { span: 6 },
    // wrapperCol: { span: 8 },
  };

  /**
   * 跳转到GitHub OAuth授权页面
   * 实现第三方登录功能
   */
  const toGoogle = () => {
    window.location.href =
      'https://github.com/login/oauth/authorize?scope=user:email&client_id=302129228f0d96055bee';
  };

  return (
    <div className={styles.loginPage}>
      {/* 左侧登录/注册表单区域 */}
      <div className={styles.loginLeft}>
        <div className={styles.leftContainer}>
          {/* 页面标题和描述 */}
          <div className={styles.loginTitle}>
            <div>{title === 'login' ? t('login') : t('register')}</div>
            <span>
              {title === 'login'
                ? t('loginDescription')
                : t('registerDescription')}
            </span>
          </div>

          {/* 登录/注册表单 */}
          <Form
            form={form}
            layout="vertical"
            name="dynamic_rule"
            style={{ maxWidth: 600 }}
          >
            {/* 邮箱输入框 */}
            <Form.Item
              {...formItemLayout}
              name="email"
              label={t('emailLabel')}
              rules={[{ required: true, message: t('emailPlaceholder') }]}
            >
              <Input size="large" placeholder={t('emailPlaceholder')} />
            </Form.Item>

            {/* 注册时显示昵称输入框 */}
            {title === 'register' && (
              <Form.Item
                {...formItemLayout}
                name="nickname"
                label={t('nicknameLabel')}
                rules={[{ required: true, message: t('nicknamePlaceholder') }]}
              >
                <Input size="large" placeholder={t('nicknamePlaceholder')} />
              </Form.Item>
            )}

            {/* 密码输入框 */}
            <Form.Item
              {...formItemLayout}
              name="password"
              label={t('passwordLabel')}
              rules={[{ required: true, message: t('passwordPlaceholder') }]}
            >
              <Input.Password
                size="large"
                placeholder={t('passwordPlaceholder')}
                onPressEnter={onCheck}
              />
            </Form.Item>

            {/* 登录时显示记住我选项 */}
            {title === 'login' && (
              <Form.Item name="remember" valuePropName="checked">
                <Checkbox> {t('rememberMe')}</Checkbox>
              </Form.Item>
            )}

            {/* 登录/注册切换提示 */}
            <div>
              {title === 'login' && registerEnabled && (
                <div>
                  {t('signInTip')}
                  <Button type="link" onClick={changeTitle}>
                    {t('signUp')}
                  </Button>
                </div>
              )}
              {title === 'register' && (
                <div>
                  {t('signUpTip')}
                  <Button type="link" onClick={changeTitle}>
                    {t('login')}
                  </Button>
                </div>
              )}
            </div>

            {/* 主要操作按钮 */}
            <Button
              type="primary"
              block
              size="large"
              onClick={onCheck}
              loading={loading}
            >
              {title === 'login' ? t('login') : t('continue')}
            </Button>

            {/* 第三方登录按钮 - 仅在登录页面显示 */}
            {title === 'login' && (
              <>
                {/* Google登录按钮 - 已注释 */}
                {/* <Button
                  block
                  size="large"
                  onClick={toGoogle}
                  style={{ marginTop: 15 }}
                >
                  <div>
                    <Icon
                      icon="local:google"
                      style={{ verticalAlign: 'middle', marginRight: 5 }}
                    />
                    Sign in with Google
                  </div>
                </Button> */}

                {/* GitHub登录按钮 - 仅在特定域名下显示 */}
                {location.host === Domain && (
                  <Button
                    block
                    size="large"
                    onClick={toGoogle}
                    style={{ marginTop: 15 }}
                  >
                    <div className="flex items-center">
                      <Icon
                        icon="local:github"
                        style={{ verticalAlign: 'middle', marginRight: 5 }}
                      />
                      Sign in with Github
                    </div>
                  </Button>
                )}
              </>
            )}
          </Form>
        </div>
      </div>

      {/* 右侧面板区域 */}
      <div className={styles.loginRight}>
        <RightPanel></RightPanel>
      </div>
    </div>
  );
};

export default Login;
