import { Controller, Get, Req, Res, UseGuards, VERSION_NEUTRAL } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller({
  path: 'auth',
  version: [VERSION_NEUTRAL, '1'],
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Guards redirect to google
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    const data = await this.authService.googleLogin(req);
    const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/login/success?token=${data.access_token}`);
  }
}
