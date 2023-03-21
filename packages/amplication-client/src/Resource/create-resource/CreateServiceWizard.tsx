import { Modal, Snackbar } from "@amplication/design-system";
import React, { useCallback, useContext, useState } from "react";
import { match, useHistory } from "react-router-dom";
import * as H from "history";
import { formatError } from "../../util/error";
import "./CreateServiceWizard.scss";
import { AppRouteProps } from "../../routes/routesUtil";
import { AppContext } from "../../context/appContext";
import ServiceWizard from "./ServiceWizard";
import CreateServiceName from "./wizard-pages/CreateServiceName";
import CreateGithubSync from "./wizard-pages/CreateGithubSync";
import CreateGenerationSettings from "./wizard-pages/CreateGenerationSettings";
import CreateServiceRepository from "./wizard-pages/CreateServiceRepository";
import CreateServiceDatabase from "./wizard-pages/CreateServiceDatabase";
import CreateServiceAuth from "./wizard-pages/CreateServiceAuth";
import {
  schemaArray,
  ResourceInitialValues,
  WizardProgressBarInterface,
  wizardProgressBarSchema,
} from "./wizardResourceSchema";
import { ResourceSettings } from "./wizard-pages/interfaces";
import CreateServiceCodeGeneration from "./wizard-pages/CreateServiceCodeGeneration";
import { CreateServiceNextSteps } from "./wizard-pages/CreateServiceNextSteps";
import { prepareServiceObject } from "../constants";
import * as models from "../../models";
import { AnalyticsEventNames } from "../../util/analytics-events.types";
import { useTracking } from "../../util/analytics";
import { expireCookie, getCookie } from "../../util/cookie";

type Props = AppRouteProps & {
  match: match<{
    workspace: string;
    project: string;
  }>;
  location: H.Location;
};

const signupCookie = getCookie("signup");

const CreateServiceWizard: React.FC<Props> = ({
  moduleClass,
  innerRoutes,
  ...props
}) => {
  const {
    errorCreateService,
    currentProject,
    currentWorkspace,
    loadingCreateService,
    setNewService,
    createServiceWithEntitiesResult: createResult,
  } = useContext(AppContext);

  const { trackEvent } = useTracking();
  const history = useHistory();

  const defineUser = signupCookie === "1" ? "Onboarding" : "Create Service";
  const wizardPattern = [0, 1, 2, 3, 4, 5, 6, 7];
  // defineUser === "Create Service"
  //   ? [0, 1, 2, 3, 4, 5, 7]
  //   : [0, 1, 2, 3, 4, 5, 6, 7];
  const errorMessage = formatError(errorCreateService);
  const setWizardProgressItems = useCallback(() => {
    const pagesMap = {};
    return wizardPattern.reduce(
      (wizardArr: WizardProgressBarInterface[], page: number) => {
        const findPage = wizardProgressBarSchema.find(
          (item: WizardProgressBarInterface) => item.activePages.includes(page)
        );
        if (!findPage) return wizardArr;

        if (pagesMap[findPage.title]) return wizardArr;

        pagesMap[findPage.title] = { ...findPage, pageIndex: page };
        wizardArr.push(findPage);

        return wizardArr;
      },
      []
    );
  }, [wizardPattern]);

  const createStarterResource = useCallback(
    (
      data: models.ResourceCreateWithEntitiesInput,
      databaseType: "postgres" | "mysql" | "mongo",
      authType: string,
      eventName: string
    ) => {
      setNewService(data, databaseType, authType, eventName);
    },
    [setNewService]
  );

  const handleCloseWizard = useCallback(
    (currentPage: string) => {
      history.push(`/${currentWorkspace.id}/${currentProject.id}`);
    },
    [currentWorkspace, currentProject]
  );

  const handleWizardProgress = useCallback(
    (dir: "next" | "prev", page: string) => {
      trackEvent({
        eventName:
          AnalyticsEventNames[
            dir === "next"
              ? "ServiceWizardStep_ContinueClick"
              : "ServiceWizardStep_BackClick"
          ],
        category: "Service Wizard",
        WizardType: defineUser,
        step: page,
      });
    },
    []
  );

  const trackWizardPageEvent = useCallback(
    (
      eventName: AnalyticsEventNames,
      additionalData?: { [key: string]: string }
    ) => {
      trackEvent({
        eventName,
        category: "Service Wizard",
        WizardType: defineUser,
        ...additionalData,
      });
    },
    []
  );

  const createResource = useCallback(
    (activeIndex: number, values: ResourceSettings) => {
      const {
        serviceName,
        generateAdminUI,
        generateGraphQL,
        generateRestApi,
        gitOrganizationId,
        gitRepositoryName,
        authType,
        databaseType,
        baseDir,
      } = values;

      const serverDir = `${baseDir}/${serviceName}`;
      const adminDir = `${baseDir}/${serviceName}-admin`;

      const isResourceWithEntities = values.resourceType === "sample";

      if (currentProject) {
        const resource = prepareServiceObject(
          serviceName,
          currentProject?.id,
          isResourceWithEntities,
          generateAdminUI,
          generateGraphQL,
          generateRestApi,
          {
            name: gitRepositoryName,
            gitOrganizationId: gitOrganizationId,
            resourceId: "",
          },
          serverDir,
          adminDir
        );

        createStarterResource(
          resource,
          databaseType,
          authType,
          isResourceWithEntities
            ? "createResourceFromSample"
            : "createResourceFromScratch"
        );
      }
      console.log("***********", values);
      expireCookie("signup");
    },
    []
  );

  return (
    <Modal open fullScreen css={moduleClass}>
      <ServiceWizard
        wizardPattern={wizardPattern}
        wizardProgressBar={setWizardProgressItems()}
        wizardSchema={schemaArray}
        wizardInitialValues={ResourceInitialValues}
        wizardSubmit={createResource}
        moduleCss={moduleClass}
        submitFormPage={5}
        submitLoader={loadingCreateService}
        handleCloseWizard={handleCloseWizard}
        handleWizardProgress={handleWizardProgress}
      >
        <CreateServiceName
          moduleClass={moduleClass}
          trackWizardPageEvent={trackWizardPageEvent}
        />
        <CreateGithubSync
          moduleClass={moduleClass}
          trackWizardPageEvent={trackWizardPageEvent}
        />
        <CreateGenerationSettings
          moduleClass={moduleClass}
          trackWizardPageEvent={trackWizardPageEvent}
        />
        <CreateServiceRepository
          moduleClass={moduleClass}
          trackWizardPageEvent={trackWizardPageEvent}
        />
        <CreateServiceDatabase
          moduleClass={moduleClass}
          trackWizardPageEvent={trackWizardPageEvent}
        />
        <CreateServiceAuth
          moduleClass={moduleClass}
          trackWizardPageEvent={trackWizardPageEvent}
        />
        <CreateServiceCodeGeneration
          moduleClass="create-service-code-generation"
          resource={createResult?.resource}
          build={createResult?.build}
          trackWizardPageEvent={trackWizardPageEvent}
        />
        <CreateServiceNextSteps
          moduleClass={moduleClass}
          trackWizardPageEvent={trackWizardPageEvent}
        />
      </ServiceWizard>
      <Snackbar open={Boolean(errorCreateService)} message={errorMessage} />
    </Modal>
  );
};

export default CreateServiceWizard;
