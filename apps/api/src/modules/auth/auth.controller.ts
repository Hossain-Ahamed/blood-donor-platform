import { Controller, Get, Post, Body, Req, Res, UseGuards, VERSION_NEUTRAL } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('Authentication')
@Controller({
  path: 'auth',
  version: [VERSION_NEUTRAL, '1'],
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth2 authentication flow' })
  async googleAuth() {
    // Guards redirect to google
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth2 callback (redirects to frontend with tokens)' })
  async googleAuthRedirect(@Req() req, @Res() res) {
    const data = await this.authService.googleLogin(req);
    const frontendUrl = process.env.CORS_ORIGIN || `${req.protocol}://${req.get('host')}`;
    return res.redirect(
      `${frontendUrl}/login/success?token=${data.access_token}&refresh_token=${data.refresh_token}`,
    );
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access and refresh token pair' })
  @ApiResponse({ status: 200, description: 'Tokens successfully refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refreshTokens(body?.refresh_token);
  }
}
