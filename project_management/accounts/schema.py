import re
import base64
import io
from PIL import Image
import graphene
from graphene_django import DjangoObjectType
from graphql_auth import mutations
from graphql_auth.schema import UserQuery, MeQuery
from graphql_jwt.decorators import login_required, ensure_token
from django.conf import settings

from accounts.models import CustomUser, Company
from myob.models import MyobUser, CompanyFile
from api.models import Insurance
from api.schema import UserInputType, InsuranceInputType

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
    @login_required
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

            with open(f'{settings.MEDIA_ROOT}/company_logos/{name}_logo.{logo_type}', 'wb') as f:
                f.write(logo_b64)
            
            company.logo_path = f'{settings.MEDIA_ROOT}/company_logos/{name}_logo.{logo_type}'

        company.save()
        return self(success=True, message="Company Created")

# class UpdateCompany(graphene.Mutation):
#     class Arguments:
#         id = graphene.String()
#         name = graphene.String()
#         logo = graphene.String(required=False)

#     success = graphene.Boolean()
#     message = graphene.String()

#     @classmethod
#     @login_required
#     def mutate(self, root, info, name, logo):

#         if not Company.objects.filter(name=name).exists():
#             return self(success=False, message="Company not found")

#         company = Company.objects.get(id=id)
#         company.name = name
#         if logo:
#             logo = logo.replace('data:image/jpeg;base64', '').replace('data:image/png;base64', '')
#             img = Image.open(io.BytesIO(base64.decodestring(logo)))
#             company.logo = img

#         return self(success=True, message="Company Created")

class IDInputType(graphene.InputObjectType):
    id = graphene.String()

class CompanyInputType(graphene.InputObjectType):
    id = graphene.String()
    name = graphene.String()
    default_myob_file = graphene.Field(IDInputType)
    default_myob_account = graphene.Field(IDInputType)


class UpdateCompany(graphene.Mutation):
    class Arguments:
        companyInfo = CompanyInputType()
        employees = graphene.List(UserInputType)
        insurances = graphene.List(InsuranceInputType)

    success = graphene.String()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, companyInfo, employees, insurances):
        if not Company.objects.filter(id=companyInfo.id).exists():
            return self(success=False, message="Company not found")

        company = Company.objects.get(id=companyInfo.id)
        company.name = companyInfo.name
        company.default_myob_file = CompanyFile.objects.get(id=companyInfo.default_myob_file.id)
        # company.default_myob_account = companyInfo.default_myob_account
        company.save()

        # if logo:
        #     logo = logo.replace('data:image/jpeg;base64', '').replace('data:image/png;base64', '')
        #     img = Image.open(io.BytesIO(base64.decodestring(logo)))
        #     company.logo = img

        for emp in employees:
            if CustomUser.objects.filter(email=emp.email).exists():
                user = CustomUser.objects.get(email=emp.email)
                user.first_name = emp.first_name
                user.last_name = emp.last_name
                user.is_active = emp.is_active
                user.is_staff = emp.is_staff
                user.role = emp.role
                user.myob_user = MyobUser.objects.get(id=emp.myob_user.id) if emp.myob_user and MyobUser.objects.filter(id=emp.myob_user.id).exists() else None
                user.myob_access = emp.myob_access
                user.save()

        for ins in insurances:
            if Insurance.objects.filter(id=ins.id).exists():
                insurance = Insurance.objects.get(id=ins.id)
                insurance.description = ins.description
                insurance.issue_date = ins.issueDate
                insurance.start_date = ins.startDate
                insurance.expiry_date = ins.expiryDate
                insurance.active = ins.active
                insurance.save()
            
        return self(success=True, message="Company Details Updated")


class CustomUserType(DjangoObjectType):
    class Meta:
        model = CustomUser
        fields = '__all__'

class UpdateUser(graphene.Mutation):
    class Arguments:
        id = graphene.ID()
        email = graphene.String()
        first_name = graphene.String()
        last_name = graphene.String()
        phone = graphene.String()
        position = graphene.String()
        default_pagination_amount = graphene.Int()
        role = graphene.String()
        staff = graphene.Boolean()
        myobAccess = graphene.Boolean()

    user = graphene.Field(CustomUserType)
    success = graphene.Boolean()

    @classmethod
    @login_required
    def mutate (self, root, info, id, first_name=None, last_name=None, email=None, phone=None, position=None, default_pagination_amount=None, role=None, staff=None, myobAccess=None):
        if CustomUser.objects.filter(pk=id).exists():
            user = CustomUser.objects.get(pk=id)
            if not first_name == None: user.first_name = first_name
            if not last_name == None: user.last_name = last_name
            if not phone == None: user.phone = phone
            if not position == None: user.position = position
            if not default_pagination_amount == None: user.default_pagination_amount = default_pagination_amount
            user.is_active = True
            if not staff == None: user.is_staff = staff
            if not email == None:
                user.email = email
                user.username = email
            if not role == None: user.role = role
            if not myobAccess == None: user.myob_access = myobAccess
            user.save()

            return self(success=True, user=user)
        return self(success=False, user=user)

class DeleteUser(graphene.Mutation):
    class Arguments:
        id = graphene.String()

    ok = graphene.Boolean()

    @classmethod
    @login_required
    def mutate(self, root, info, id):
        if CustomUser.objects.filter(pk=id).exists():
            user = CustomUser.objects.get(pk=id)
            user.delete()
            return self(ok=True)
        return self(ok=False)

class PersistLogin(graphene.Mutation):
    class Arguments:
        pass

    user = graphene.Field(CustomUserType)
    access_token = graphene.String()

    @classmethod
    def mutate(self, root, info):
        user = info.context.user
        print(user)

        refresh_token = info.context.COOKIES.get("JWT-refresh-token")
        print(refresh_token)
        
        if refresh_token:
            if not CustomUser.objects.filter(refresh_token=refresh_token).exists():
                print("No user with token", refresh_token)
                return self(user=None)
            
            user = CustomUser.objects.get(refresh_token=refresh_token)

        # Refresh token then revoke the old
        refresh = mutations.RefreshToken.mutate(root, info, refresh_token=user.refresh_token)
        if refresh.refresh_token == None:
            print("Bad Refresh")
            return self(user=user)
        
        mutations.RevokeToken.mutate(root, info, refresh_token=user.refresh_token)       

        # Save the new token
        print("New RT:", user.email, refresh.refresh_token)
        user.refresh_token = refresh.refresh_token
        user.save()

        # Update the token cookie
        # info.context.JWT = refresh.token
        # info.context['JWT-refresh-token'] = refresh.refresh_token

        return self(user=user, access_token=refresh.token)


class UpdateUserRefreshToken(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)
        refreshToken = graphene.String(required=True)

    user = graphene.Field(CustomUserType)

    @classmethod
    @login_required
    def mutate (self, root, info, refreshToken, id):
        print("Updating User Refresh Token")
        print(info.context.user, refreshToken)

        user = CustomUser.objects.get(pk=id)
        user.refresh_token = refreshToken
        user.save()
        
        return self(user=user)

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
    my_company = graphene.Field(CompanyType)

    @login_required
    def resolve_companies(root, info): 
        return Company.objects.all()
    
    @login_required
    def resolve_my_company(root, info):
        user = CustomUser.objects.get(id=info.context.user.id)
        company = Company.objects.filter(id=user.company.id)
        return company[0]

    # users = graphene.List(CustomUserType)
    # def resolve_users(root, info, is_staff=None):
    #     if not is_staff == None:
    #         return CustomUser.objects.filter(is_staff=is_staff)

    #     return CustomUser.objects.all()

    user_refresh_token = graphene.List(CustomUserType)

    @ensure_token
    def resolve_user_refresh_token(root, info, **kwargs):
        cookie = info.context.COOKIES.get("JWT-refresh-token")
        # refresh_token_matches = re.search("(?<=JWT-refresh-token=)(.*)(?=;)?", cookies)
        
        if cookie:
            return CustomUser.objects.filter(refresh_token=cookie)

        return None
        

class Mutation(AuthMutation, graphene.ObjectType):
    update_user_refresh_token = UpdateUserRefreshToken.Field()
    update_user = UpdateUser.Field()
    delete_user = DeleteUser.Field()
    create_company = CreateCompany.Field()
    update_company = UpdateCompany.Field()

    persist_login = PersistLogin.Field()
