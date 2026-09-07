import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('../src/auth/native-api', () => ({
  nativeRegister: jest.fn(),
  requestRegistrationVerification: jest.fn(),
  verifyRegistrationCode: jest.fn(),
}));

import * as authApi from '../src/auth/native-api';
import { router } from 'expo-router';
import RegisterScreen from './register';

function fillAccount() {
  fireEvent.changeText(screen.getByLabelText('이메일'), 'a@b.com');
  fireEvent.changeText(screen.getByLabelText('이름'), 'Ada');
  fireEvent.changeText(screen.getByLabelText('비밀번호'), 'password1234');
}

describe('RegisterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(authApi.requestRegistrationVerification).mockResolvedValue();
    jest.mocked(authApi.verifyRegistrationCode).mockResolvedValue({
      registrationProof: 'internal-proof',
    });
    jest.mocked(authApi.nativeRegister).mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'r'.repeat(32),
      user: { id: 'user-1', email: 'a@b.com', name: 'Ada', roles: ['USER'] },
    });
  });

  it('completes request, verify, and native registration without asking for proof', async () => {
    render(<RegisterScreen />);
    fillAccount();
    expect(screen.queryByLabelText(/증명|proof/i)).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: '인증 코드 받기' }));
    const code = await screen.findByLabelText('이메일 인증 코드');
    fireEvent.changeText(code, '123456');
    fireEvent.press(screen.getByRole('button', { name: '인증하고 가입' }));
    await waitFor(() =>
      expect(authApi.nativeRegister).toHaveBeenCalledWith({
        email: 'a@b.com',
        name: 'Ada',
        password: 'password1234',
        registrationProof: 'internal-proof',
      }),
    );
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  });

  it('keeps the user on the first step when requesting a code fails', async () => {
    jest.mocked(authApi.requestRegistrationVerification).mockRejectedValue(new Error('send failed'));
    render(<RegisterScreen />);
    fillAccount();
    fireEvent.press(screen.getByRole('button', { name: '인증 코드 받기' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('send failed');
    expect(screen.queryByLabelText('이메일 인증 코드')).toBeNull();
    expect(authApi.nativeRegister).not.toHaveBeenCalled();
  });

  it('does not register when code verification fails', async () => {
    jest.mocked(authApi.verifyRegistrationCode).mockRejectedValue(new Error('invalid code'));
    render(<RegisterScreen />);
    fillAccount();
    fireEvent.press(screen.getByRole('button', { name: '인증 코드 받기' }));
    const code = await screen.findByLabelText('이메일 인증 코드');
    fireEvent.changeText(code, '000000');
    fireEvent.press(screen.getByRole('button', { name: '인증하고 가입' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('invalid code');
    expect(authApi.nativeRegister).not.toHaveBeenCalled();
  });

  it('validates the API account constraints before requesting a code', async () => {
    render(<RegisterScreen />);
    fireEvent.changeText(screen.getByLabelText('이메일'), 'a@b.com');
    fireEvent.changeText(screen.getByLabelText('이름'), 'A');
    fireEvent.changeText(screen.getByLabelText('비밀번호'), 'short');
    fireEvent.press(screen.getByRole('button', { name: '인증 코드 받기' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('이름은 2자 이상 60자 이하로 입력해 주세요.');
    expect(authApi.requestRegistrationVerification).not.toHaveBeenCalled();
  });

  it('returns to editable account fields when final registration fails', async () => {
    jest.mocked(authApi.nativeRegister).mockRejectedValue(new Error('register failed'));
    render(<RegisterScreen />);
    fillAccount();
    fireEvent.press(screen.getByRole('button', { name: '인증 코드 받기' }));
    const code = await screen.findByLabelText('이메일 인증 코드');
    expect(screen.getByLabelText('이름')).toHaveProp('editable', false);
    fireEvent.changeText(code, '123456');
    fireEvent.press(screen.getByRole('button', { name: '인증하고 가입' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('register failed');
    expect(screen.queryByLabelText('이메일 인증 코드')).toBeNull();
    expect(screen.getByLabelText('이름')).toHaveProp('editable', true);
  });
});
