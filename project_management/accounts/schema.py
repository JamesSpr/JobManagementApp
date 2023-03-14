import re
import base64
import io
from PIL import Image
import graphene
from graphene_django import DjangoObjectType
from graphql_auth import mutations, relay
from graphql_auth.schema import UserQuery, MeQuery
from accounts.models import CustomUser, Company
from graphene_django.filter import DjangoFilterConnectionField
from django.core.validators import EMPTY_VALUES

class CompanyType(DjangoObjectType):
    class Meta:
        model = Company
        fields = '__all__'

class CreateCompany(graphene.Mutation):
    class Arguments:
        name = graphene.String()
        logo = graphene.String(required=False)

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(self, root, info, name, logo):

        if Company.objects.filter(name=name).exists():
            return self(success=False, message="Company already exists")

        company = Company()
        company.name = name

        if logo:
            if 'data:image/jpeg;base64' in logo:
                logo_type = 'jpeg'
            elif 'data:image/png;base64' in logo:
                logo_type = 'png'
            else:
                return self(success=False, message="Logo must be jpeg or png")

            logo = logo.replace('data:image/jpeg;base64,', '').replace('data:image/png;base64,', '')
            logo_b64 = base64.b64decode(logo, validate=True)

            with open(f'./media/company_logos/{name}_logo.{logo_type}', 'wb') as f:
                f.write(logo_b64)
            
            company.logo_path = './media/company_logos/{name}_logo.{logo_type}'

        company.save()
        return self(success=True, message="Company Created")

class UpdateCompany(graphene.Mutation):
    class Arguments:
        id = graphene.String()
        name = graphene.String()
        logo = graphene.String(required=False)

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(self, root, info, name, logo):

        if not Company.objects.filter(name=name).exists():
            return self(success=False, message="Company not found")

        company = Company.objects.get(id=id)
        company.name = name
        if logo:
            logo = logo.replace('data:image/jpeg;base64', '').replace('data:image/png;base64', '')
            img = Image.open(io.BytesIO(base64.decodestring(logo)))
            company.logo = img

        return self(success=True, message="Company Created")


class CustomUserType(DjangoObjectType):
    class Meta:
        model = CustomUser
        fields = '__all__'

class UserRefreshTokenMutation(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)
        refreshToken = graphene.String(required=True)

    user = graphene.Field(CustomUserType)

    @classmethod
    def mutate (cls, root, info, refreshToken, id):
        user = CustomUser.objects.get(pk=id)
        user.refresh_token = refreshToken
        user.save()
        return UserRefreshTokenMutation(user=user)

class UpdateUser(graphene.Mutation):
    class Arguments:
        id = graphene.ID()
        email = graphene.String(required=False)
        first_name = graphene.String(required=False)
        last_name = graphene.String(required=False)
        phone = graphene.String(required=False)
        position = graphene.String(required=False)
        default_pagination_amount = graphene.Int(required=False)
        role = graphene.String(required=False)
        staff = graphene.Boolean(required=False)
    
    user = graphene.Field(CustomUserType)
    success = graphene.Boolean()

    @classmethod
    def mutate (cls, root, info, id, first_name=None, last_name=None, email=None, phone=None, position=None, default_pagination_amount=None, role=None, staff=None):
        if CustomUser.objects.filter(pk=id).exists():
            user = CustomUser.objects.get(pk=id)
            if first_name: user.first_name = first_name
            if last_name: user.last_name = last_name
            if phone: user.phone = phone
            if position: user.position = position
            if default_pagination_amount: user.default_pagination_amount = default_pagination_amount
            user.is_active = True
            if not staff == None: user.is_staff = staff
            if email:
                user.email = email
                user.username = email
            if role: user.role = role
            user.save()
            return cls(success=True, user=user)
        return cls(success=False, user=user)

class DeleteUser(graphene.Mutation):
    class Arguments:
        id = graphene.String()

    ok = graphene.Boolean()

    @classmethod
    def mutate(self, root, info, id):
        if CustomUser.objects.filter(pk=id).exists():
            user = CustomUser.objects.get(pk=id)
            user.delete()
            return self(ok=True)
        return self(ok=False)


class AuthMutation(graphene.ObjectType):    
    register = mutations.Register.Field()
    verify_account = mutations.VerifyAccount.Field()
    resend_activation_email = mutations.ResendActivationEmail.Field()
    send_password_reset_email = mutations.SendPasswordResetEmail.Field()
    password_reset = mutations.PasswordReset.Field()
    password_change = mutations.PasswordChange.Field()
    archive_account = mutations.ArchiveAccount.Field()
    delete_account = mutations.DeleteAccount.Field()
    update_account = mutations.UpdateAccount.Field()
    send_secondary_email_activation = mutations.SendSecondaryEmailActivation.Field()
    verify_secondary_email = mutations.VerifySecondaryEmail.Field()
    swap_emails = mutations.SwapEmails.Field()

    # django-graphql-jwt inheritances
    token_auth = mutations.ObtainJSONWebToken.Field()
    verify_token = mutations.VerifyToken.Field()
    refresh_token = mutations.RefreshToken.Field()
    revoke_token = mutations.RevokeToken.Field()

class Query(UserQuery, MeQuery, graphene.ObjectType):
    companies = graphene.List(CompanyType)

    def resolve_companies(root, info):
        return Company.objects.all()


    user_refresh_token = graphene.List(CustomUserType)

    def resolve_user_refresh_token(root, info, **kwargs):
        cookies = info.context.META.get('HTTP_COOKIE')

        refresh_token_matches = re.search("(?<=JWT-refresh-token=)(.*)(?=;)", cookies)
        if refresh_token_matches:
            refresh_token = refresh_token_matches.group()
            return CustomUser.objects.filter(refresh_token=refresh_token)

        refresh_token_matches = re.search("(?<=JWT-refresh-token=)(.*)", cookies)
        if refresh_token_matches:
            refresh_token = refresh_token_matches.group()
            return CustomUser.objects.filter(refresh_token=refresh_token)

        return None
        

class Mutation(AuthMutation, graphene.ObjectType):
    update_user_refresh_token = UserRefreshTokenMutation.Field()
    update_user = UpdateUser.Field()
    delete_user = DeleteUser.Field()
    create_company = CreateCompany.Field()
    update_company = UpdateCompany.Field()
